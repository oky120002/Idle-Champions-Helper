import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { attachSignalSemantics } from '../../src/domain/abilities/signalSemantics.ts'
import {
  collectEffectEntries,
  normalizeEffectSignal,
  shouldIgnoreUnsupportedEffectEntry,
  splitEffectString,
} from './effect-helpers.mjs'
import { readJson, writeJson } from './io-utils.mjs'

const DEFAULT_VERSION_DIR = 'public/data/v1'
const DEFAULT_SEMANTIC_OVERRIDES = 'scripts/data/semantic-overrides.json'

function buildOfficialHeroModel(champion, detail) {
  const carrySignals = []
  const supportSignals = []
  const unsupportedSignals = []

  for (const entry of collectEffectEntries(detail)) {
    const split = splitEffectString(entry.effectString)

    if (!split) {
      continue
    }

    const parsed = normalizeEffectSignal(split.effectName, split.effectValue, 'official-parsed', entry)

    if (parsed.ok) {
      const signal = attachSignalSemantics(parsed.signal, entry.effect)
      if (parsed.bucket === 'carrySignals') {
        carrySignals.push(signal)
      } else {
        supportSignals.push(signal)
      }
    } else {
      if (!shouldIgnoreUnsupportedEffectEntry(parsed.unsupported?.rawEffect ?? '')) {
        unsupportedSignals.push(parsed.unsupported)
      }
    }
  }

  const rawBaseDamage = Number(detail.baseDamage)
  const baseDamage = Number.isFinite(rawBaseDamage) ? rawBaseDamage : 0
  const costCurves = detail.costCurves && typeof detail.costCurves === 'object' ? detail.costCurves : null
  const rawBaseHealth = Number(detail.baseHealth)
  const baseHealth = Number.isFinite(rawBaseHealth) ? rawBaseHealth : 0
  const healthCurves = detail.healthCurves && typeof detail.healthCurves === 'object' ? detail.healthCurves : null

  return {
    heroId: champion.id,
    name: champion.name,
    seat: champion.seat,
    roles: champion.roles,
    tags: champion.tags,
    baseAttackDamageTypes: detail.attacks?.base?.damageTypes ?? [],
    baseAttackCooldown: typeof detail.attacks?.base?.cooldown === 'number' ? detail.attacks.base.cooldown : null,
    age: typeof detail.characterSheet?.age === 'number' ? detail.characterSheet.age : null,
    abilityScores: detail.characterSheet?.abilityScores ?? {},
    baseDamage,
    costCurves,
    baseHealth,
    healthCurves,
    carrySignals,
    supportSignals,
    unsupportedSignals,
    sourceBreakdown: {
      carrySignals: carrySignals.map(() => 'official-parsed'),
      supportSignals: supportSignals.map(() => 'official-parsed'),
      unsupportedSignals: unsupportedSignals.map(() => 'official-parsed'),
    },
  }
}

function contextMatchesVariant(context, variant) {
  if (context.kind === 'variant') {
    return context.id === variant.id
  }

  if (context.kind === 'adventure') {
    return context.id === variant.adventureId
  }

  if (context.kind === 'campaign') {
    return context.id === variant.campaign.id
  }

  return false
}

function findFormationForVariant(formations, variant) {
  return formations.find((formation) => {
    const contexts = [
      ...(formation.applicableContexts ?? []),
      ...(formation.sourceContexts ?? []),
    ]

    return contexts.some((context) => contextMatchesVariant(context, variant))
  }) ?? null
}

function projectMechanicsToScenario(variant, slotTopology) {
  const mechanics = new Set(variant.mechanics ?? [])
  const lockedSlots = []
  const mechanicWarnings = []

  const hasEscort = mechanics.has('slot_escort')
    || mechanics.has('slot_escort_by_area')
    || mechanics.has('slot_escort_wandering')

  if (hasEscort) {
    // ponytail: 官方数据未标注护送占用的具体槽位；按 column 降序锁前排首槽。
    // 精确槽位需官方 formation 元数据或人工校准后替换此启发式。
    const frontSlot = [...slotTopology].sort((a, b) => b.column - a.column || a.row - b.row)[0]
    if (frontSlot) {
      lockedSlots.push(frontSlot.slotId)
    }
    mechanicWarnings.push('当前场景含护送任务，前排一个槽位预留给护送目标，不参与英雄占位。')
  }

  if (mechanics.has('time_out') || mechanics.has('click_damage_area_limit')) {
    mechanicWarnings.push('当前场景含计时或点击限制，攻速与持续输出价值提升。')
  }

  return { lockedSlots, mechanicWarnings }
}

function buildOfficialScenarioModel(variant, formations) {
  const formation = findFormationForVariant(formations, variant)
  const slotTopology = formation
    ? formation.slots.map((slot) => ({
        slotId: slot.id,
        row: slot.row,
        column: slot.column,
        x: slot.x,
        y: slot.y,
        adjacentSlotIds: slot.adjacentSlotIds ?? [],
      }))
    : []
  const { lockedSlots, mechanicWarnings } = projectMechanicsToScenario(variant, slotTopology)

  return {
    variantId: variant.id,
    scenarioRef: { kind: 'variant', id: variant.id },
    name: variant.name,
    formationLayoutId: formation?.id ?? null,
    objectiveArea: variant.objectiveArea ?? null,
    slotTopology,
    forcedHeroes: variant.forcedHeroIds ?? [],
    bannedHeroes: [],
    lockedSlots,
    enemyTypes: variant.enemyTypes ?? [],
    allowedHeroes: variant.allowedHeroIds ?? [],
    allowedTags: variant.allowedTags ?? [],
    scenarioWarnings: [
      ...mechanicWarnings,
      ...(variant.restrictions.length > 0
        ? ['当前场景 restrictions 为自由文本，尚未自动解析，请人工复核规则限制。']
        : []),
      ...(formation ? [] : ['当前场景没有匹配的阵型布局。']),
      ...(variant.allowedHeroIds?.length || variant.allowedTags?.length
        ? ['当前场景仅允许特定英雄（only_allow_crusaders），候选池已按白名单过滤。']
        : []),
    ],
  }
}

function normalizeSemanticOverrides(rawOverrides, updatedAt) {
  const items = Object.entries(rawOverrides.heroOverrides ?? {}).map(([heroId, patch]) => ({
    heroId,
    carrySignals: Array.isArray(patch?.carrySignals) ? patch.carrySignals : undefined,
    supportSignals: Array.isArray(patch?.supportSignals) ? patch.supportSignals : undefined,
    unsupportedSignals: Array.isArray(patch?.unsupportedSignals) ? patch.unsupportedSignals : undefined,
  }))

  return {
    items,
    updatedAt,
  }
}

export async function buildModels(options = {}) {
  const versionDir = path.resolve(options.versionDir ?? DEFAULT_VERSION_DIR)
  const semanticOverridesFile = path.resolve(
    options.semanticOverridesFile ?? DEFAULT_SEMANTIC_OVERRIDES,
  )
  const champions = await readJson(path.join(versionDir, 'champions.json'))
  const variants = await readJson(path.join(versionDir, 'variants.json'))
  const formations = await readJson(path.join(versionDir, 'formations.json'))
  const semanticOverrides = await readJson(semanticOverridesFile).catch(() => ({ heroOverrides: {} }))
  const updatedAt = champions.updatedAt ?? variants.updatedAt ?? formations.updatedAt ?? ''

  const heroAbilities = []
  for (const champion of champions.items ?? []) {
    const detail = await readJson(path.join(versionDir, 'champion-details', `${champion.id}.json`))
    heroAbilities.push(buildOfficialHeroModel(champion, detail))
  }

  const scenarioModels = (variants.items ?? []).map((variant) =>
    buildOfficialScenarioModel(variant, formations.items ?? []),
  )

  await writeJson(path.join(versionDir, 'hero-abilities.json'), {
    items: heroAbilities,
    updatedAt,
  })
  await writeJson(path.join(versionDir, 'scenarios.json'), {
    items: scenarioModels,
    updatedAt,
  })
  await writeJson(
    path.join(versionDir, 'semantic-overrides.json'),
    normalizeSemanticOverrides(semanticOverrides, updatedAt),
  )

  return {
    versionDir,
    updatedAt,
    heroCount: heroAbilities.length,
    scenarioCount: scenarioModels.length,
  }
}

async function main() {
  const result = await buildModels()

  console.log('hero ability model 构建完成：')
  console.log(`- version dir: ${result.versionDir}`)
  console.log(`- updatedAt: ${result.updatedAt}`)
  console.log(`- heroes: ${result.heroCount}`)
  console.log(`- scenarios: ${result.scenarioCount}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`构建 hero ability model 失败：${error.message}`)
    process.exitCode = 1
  })
}
