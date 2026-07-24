import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { attachSignalSemantics } from '../../src/domain/abilities/signalSemantics.ts'
import {
  collectEffectEntries,
  normalizeEffectSignal,
  shouldIgnoreUnsupportedEffectEntry,
  splitEffectString,
} from './effect-helpers.ts'
import { readJson, writeJson } from './io-utils.ts'
import { parsePatronPerkSignals } from './patron-perk-signals.ts'
import { parseRestrictions } from './restrictions-parser.ts'
import type {
  HeroAbilityProfile,
  HeroAbilitySignal,
  HeroUnsupportedSignal,
} from '../../src/domain/abilities/abilityModel'

const DEFAULT_VERSION_DIR = 'public/data/v1'
const DEFAULT_SEMANTIC_OVERRIDES = 'scripts/data/semantic-overrides.json'

interface BuildModelsOptions {
  versionDir?: string
  semanticOverridesFile?: string
}

interface BuildModelsResult {
  versionDir: string
  updatedAt: string
  heroCount: number
  scenarioCount: number
}

interface SlotTopologyEntry {
  slotId: unknown
  row: number
  column: number
  x: unknown
  y: unknown
  adjacentSlotIds: unknown[]
}

interface ScenarioModel {
  variantId: unknown
  scenarioRef: { kind: 'variant'; id: unknown }
  name: unknown
  formationLayoutId: unknown
  objectiveArea: unknown
  slotTopology: SlotTopologyEntry[]
  forcedHeroes: unknown[]
  bannedHeroes: unknown[]
  lockedSlots: unknown[]
  enemyTypes: unknown[]
  allowedHeroes: unknown[]
  allowedTags: unknown[]
  scenarioWarnings: string[]
  /** 被非英雄实体（小鸡/小鬼/护送等）占据的格数（restrictions 解析，阶段 12）。 */
  occupiedSlotCount: number
}

interface SemanticOverrideItem {
  heroId: string
  carrySignals: unknown[] | undefined
  supportSignals: unknown[] | undefined
  unsupportedSignals: unknown[] | undefined
}

interface SemanticOverridesModel {
  items: SemanticOverrideItem[]
  updatedAt: string
}

// raw JSON 收窄辅助：把 unknown 安全收成 Record<string, unknown>（null 安全）。
function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function buildOfficialHeroModel(
  champion: Record<string, unknown>,
  detail: Record<string, unknown>,
): HeroAbilityProfile {
  const carrySignals: HeroAbilitySignal[] = []
  const supportSignals: HeroAbilitySignal[] = []
  const unsupportedSignals: HeroUnsupportedSignal[] = []

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
      if (!shouldIgnoreUnsupportedEffectEntry(parsed.unsupported.rawEffect)) {
        unsupportedSignals.push(parsed.unsupported)
      }
    }
  }

  const rawBaseDamage = Number(detail.baseDamage)
  const baseDamage = Number.isFinite(rawBaseDamage) ? rawBaseDamage : 0
  const costCurvesRaw = detail.costCurves
  const costCurves = costCurvesRaw && typeof costCurvesRaw === 'object' ? costCurvesRaw as Record<string, number> : null
  const rawBaseHealth = Number(detail.baseHealth)
  const baseHealth = Number.isFinite(rawBaseHealth) ? rawBaseHealth : 0
  const healthCurvesRaw = detail.healthCurves
  const healthCurves = healthCurvesRaw && typeof healthCurvesRaw === 'object' ? healthCurvesRaw as Record<string, number> : null

  const attacks = asRecord(detail.attacks) ?? {}
  const base = asRecord(attacks.base) ?? {}
  const characterSheet = asRecord(detail.characterSheet) ?? {}

  return {
    heroId: champion.id as string,
    name: champion.name as HeroAbilityProfile['name'],
    seat: champion.seat as number,
    roles: champion.roles as string[],
    tags: champion.tags as string[],
    baseAttackDamageTypes: base.damageTypes as string[] ?? [],
    baseAttackCooldown: typeof base.cooldown === 'number' ? base.cooldown : null,
    age: typeof characterSheet.age === 'number' ? characterSheet.age : null,
    abilityScores: characterSheet.abilityScores as HeroAbilityProfile['abilityScores'] ?? {},
    baseDamage,
    costCurves,
    baseHealth,
    healthCurves,
    carrySignals,
    supportSignals,
    unsupportedSignals,
    sourceBreakdown: {
      carrySignals: carrySignals.map((): 'official-parsed' => 'official-parsed'),
      supportSignals: supportSignals.map((): 'official-parsed' => 'official-parsed'),
      unsupportedSignals: unsupportedSignals.map((): 'official-parsed' => 'official-parsed'),
    },
  }
}

function contextMatchesVariant(
  context: Record<string, unknown>,
  variant: Record<string, unknown>,
): boolean {
  if (context.kind === 'variant') {
    return context.id === variant.id
  }

  if (context.kind === 'adventure') {
    return context.id === variant.adventureId
  }

  if (context.kind === 'campaign') {
    const campaign = asRecord(variant.campaign)
    return campaign !== null && context.id === campaign.id
  }

  return false
}

function findFormationForVariant(
  formations: unknown[],
  variant: Record<string, unknown>,
): Record<string, unknown> | null {
  for (const formationRaw of formations) {
    const formation = asRecord(formationRaw)
    if (!formation) continue
    const contexts = [
      ...asArray(formation.applicableContexts),
      ...asArray(formation.sourceContexts),
    ]
    const matched = contexts.some((contextRaw) => {
      const context = asRecord(contextRaw)
      return context ? contextMatchesVariant(context, variant) : false
    })
    if (matched) return formation
  }
  return null
}

function projectMechanicsToScenario(
  variant: Record<string, unknown>,
  slotTopology: SlotTopologyEntry[],
): { lockedSlots: unknown[]; mechanicWarnings: string[] } {
  const mechanics = new Set<unknown>(asArray(variant.mechanics))
  const lockedSlots: unknown[] = []
  const mechanicWarnings: string[] = []

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

function buildOfficialScenarioModel(
  variant: Record<string, unknown>,
  formations: unknown[],
): ScenarioModel {
  const formation = findFormationForVariant(formations, variant)
  const slotTopology: SlotTopologyEntry[] = formation
    ? asArray(formation.slots).map((slotRaw) => {
        const slot = asRecord(slotRaw) ?? {}
        return {
          slotId: slot.id,
          row: typeof slot.row === 'number' ? slot.row : 0,
          column: typeof slot.column === 'number' ? slot.column : 0,
          x: slot.x,
          y: slot.y,
          adjacentSlotIds: asArray(slot.adjacentSlotIds),
        }
      })
    : []
  const { lockedSlots, mechanicWarnings } = projectMechanicsToScenario(variant, slotTopology)

  const restrictions = asArray(variant.restrictions)
  const allowedHeroIds = asArray(variant.allowedHeroIds)
  const allowedTags = asArray(variant.allowedTags)

  // 阶段 12：restrictions 文本模板匹配 → slot-occupying 格数 + 未解析 warning。
  const restrictionTexts = restrictions.map((raw) => {
    const item = asRecord(raw) ?? {}
    const original = typeof item.original === 'string' ? item.original : ''
    const localized = asRecord(item.display) ?? {}
    const display = typeof item.display === 'string'
      ? item.display
      : (typeof localized.display === 'string' ? localized.display : '')
    return { original, display }
  })
  const parsedRestrictions = parseRestrictions(restrictionTexts)
  const restrictionWarnings: string[] = []
  if (parsedRestrictions.lockedSlotCount > 0) {
    restrictionWarnings.push(`当前场景有 ${parsedRestrictions.lockedSlotCount} 个槽位被非英雄实体占据，不参与英雄占位。`)
  }
  // 未解析的非平凡 restriction → 提示含特殊机制，请人工评估（flavor 文本不映射阵型约束）。
  restrictionWarnings.push(...parsedRestrictions.warnings.map((w) => `${w}（含特殊机制，请人工评估对阵型的影响）`))

  return {
    variantId: variant.id,
    scenarioRef: { kind: 'variant', id: variant.id },
    name: variant.name,
    formationLayoutId: formation?.id ?? null,
    objectiveArea: variant.objectiveArea ?? null,
    slotTopology,
    forcedHeroes: asArray(variant.forcedHeroIds),
    bannedHeroes: [],
    lockedSlots,
    enemyTypes: asArray(variant.enemyTypes),
    allowedHeroes: allowedHeroIds,
    allowedTags,
    occupiedSlotCount: parsedRestrictions.lockedSlotCount,
    scenarioWarnings: [
      ...mechanicWarnings,
      ...restrictionWarnings,
      ...(formation ? [] : ['当前场景没有匹配的阵型布局。']),
      ...(allowedHeroIds.length > 0 || allowedTags.length > 0
        ? ['当前场景仅允许特定英雄（only_allow_crusaders），候选池已按白名单过滤。']
        : []),
    ],
  }
}

function normalizeSemanticOverrides(
  rawOverrides: unknown,
  updatedAt: string,
): SemanticOverridesModel {
  const overridesRecord = asRecord(rawOverrides) ?? {}
  const heroOverridesRecord = asRecord(overridesRecord.heroOverrides) ?? {}
  const items: SemanticOverrideItem[] = Object.entries(heroOverridesRecord).map(([heroId, patch]) => {
    const patchRecord = asRecord(patch) ?? {}
    return {
      heroId,
      carrySignals: Array.isArray(patchRecord.carrySignals) ? patchRecord.carrySignals : undefined,
      supportSignals: Array.isArray(patchRecord.supportSignals) ? patchRecord.supportSignals : undefined,
      unsupportedSignals: Array.isArray(patchRecord.unsupportedSignals) ? patchRecord.unsupportedSignals : undefined,
    }
  })

  return {
    items,
    updatedAt,
  }
}

export async function buildModels(options: BuildModelsOptions = {}): Promise<BuildModelsResult> {
  const versionDir = path.resolve(options.versionDir ?? DEFAULT_VERSION_DIR)
  const semanticOverridesFile = path.resolve(
    options.semanticOverridesFile ?? DEFAULT_SEMANTIC_OVERRIDES,
  )
  const champions = await readJson(path.join(versionDir, 'champions.json'))
  const variants = await readJson(path.join(versionDir, 'variants.json'))
  const formations = await readJson(path.join(versionDir, 'formations.json'))
  const semanticOverrides = await readJson(semanticOverridesFile).catch(() => ({ heroOverrides: {} }))
  const championsRecord = asRecord(champions) ?? {}
  const variantsRecord = asRecord(variants) ?? {}
  const formationsRecord = asRecord(formations) ?? {}
  const updatedAtRaw = championsRecord.updatedAt ?? variantsRecord.updatedAt ?? formationsRecord.updatedAt
  const updatedAt = typeof updatedAtRaw === 'string' ? updatedAtRaw : ''

  const heroAbilities: HeroAbilityProfile[] = []
  for (const championRaw of asArray(championsRecord.items)) {
    const champion = asRecord(championRaw)
    if (!champion) continue
    const championId = typeof champion.id === 'string' || typeof champion.id === 'number'
      ? String(champion.id)
      : ''
    const detail = await readJson(path.join(versionDir, 'champion-details', `${championId}.json`))
    const detailRecord = asRecord(detail) ?? {}
    heroAbilities.push(buildOfficialHeroModel(champion, detailRecord))
  }

  const scenarioModels = asArray(variantsRecord.items)
    .map((variantRaw) => {
      const variant = asRecord(variantRaw) ?? {}
      return buildOfficialScenarioModel(variant, asArray(formationsRecord.items))
    })

  await writeJson(path.join(versionDir, 'hero-abilities.json'), {
    items: heroAbilities,
    updatedAt,
  })
  await writeJson(path.join(versionDir, 'scenarios.json'), {
    items: scenarioModels,
    updatedAt,
  })

  // 阶段 11.3：patron-perk 全局加成 → global-buffs.json（per-patron patronPerkMult signals）
  const patronPerksRaw = await readJson(path.join(versionDir, 'patron-perks.json')).catch(() => ({ perks: [] }))
  const patronPerksRecord = asRecord(patronPerksRaw) ?? {}
  const patronPerkItems = asArray(patronPerksRecord.perks) as Array<Record<string, unknown>>
  const patronPerkSignals = parsePatronPerkSignals(patronPerkItems)
  const globalBuffsByPatron: Record<string, HeroAbilitySignal[]> = {}
  for (const entry of patronPerkSignals) {
    const list = globalBuffsByPatron[entry.patronId]
    if (list) {
      list.push(entry.signal)
    } else {
      globalBuffsByPatron[entry.patronId] = [entry.signal]
    }
  }
  await writeJson(path.join(versionDir, 'global-buffs.json'), {
    buffsByPatron: globalBuffsByPatron,
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

async function main(): Promise<void> {
  const result = await buildModels()

  console.log('hero ability model 构建完成：')
  console.log(`- version dir: ${result.versionDir}`)
  console.log(`- updatedAt: ${result.updatedAt}`)
  console.log(`- heroes: ${result.heroCount}`)
  console.log(`- scenarios: ${result.scenarioCount}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`构建 hero ability model 失败：${message}`)
    process.exitCode = 1
  })
}
