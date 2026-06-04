import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const DEFAULT_VERSION_DIR = 'public/data/v1'
const DEFAULT_SEMANTIC_OVERRIDES = 'scripts/data/planner-semantic-overrides.json'

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function normalizeEffectSignal(effectName, effectValue, source) {
  const numericValue = parseFloat(effectValue)

  if (effectName === 'global_dps_multiplier_mult') {
    return {
      ok: true,
      signal: { kind: 'globalDpsMultiplier', value: numericValue, rawEffect: `${effectName},${effectValue}`, source },
      bucket: 'supportSignals',
    }
  }

  if (effectName === 'hero_dps_multiplier_mult') {
    return {
      ok: true,
      signal: { kind: 'heroDpsMultiplier', value: numericValue, rawEffect: `${effectName},${effectValue}`, source },
      bucket: 'carrySignals',
    }
  }

  if (effectName.startsWith('adjacent_')) {
    return {
      ok: true,
      signal: { kind: 'adjacentBuff', value: numericValue, rawEffect: `${effectName},${effectValue}`, source },
      bucket: 'supportSignals',
    }
  }

  if (effectName.startsWith('tag_')) {
    return {
      ok: true,
      signal: { kind: 'taggedChampionBuff', value: numericValue, rawEffect: `${effectName},${effectValue}`, source },
      bucket: 'supportSignals',
    }
  }

  return {
    ok: false,
    unsupported: {
      rawEffect: effectName,
      rawValue: effectValue,
      note: `No parser for effect: ${effectName}`,
      source,
    },
  }
}

function normalizeAmountFunc(value) {
  if (value === 'add' || value === 'mult') {
    return value
  }

  return value ? 'unknown' : null
}

function normalizeTargetQualifier(effect) {
  const rawFilters = [
    ...(Array.isArray(effect?.filter_targets) ? effect.filter_targets : []),
    ...(Array.isArray(effect?.target_filters) ? effect.target_filters : []),
  ]
  const tagFilters = rawFilters
    .filter((filter) => filter && typeof filter === 'object')
    .filter((filter) => filter.type === 'by_tags' || filter.type === 'tags')
    .map((filter) => filter.tags)
    .filter((tags) => typeof tags === 'string' && tags.length > 0)
    .flatMap((tags) => tags.split(',').map((tag) => tag.trim()).filter(Boolean))

  if (tagFilters.length === 0) {
    return null
  }

  return {
    requiredTags: [...new Set(tagFilters)],
    matchMode: 'any',
  }
}

function normalizeStatQualifiers(effect) {
  const rawFilters = [
    ...(Array.isArray(effect?.filter_targets) ? effect.filter_targets : []),
    ...(Array.isArray(effect?.target_filters) ? effect.target_filters : []),
  ]

  const qualifiers = rawFilters
    .filter((filter) => filter && typeof filter === 'object')
    .filter((filter) => filter.type === 'stat' || filter.type === 'stat_score')
    .map((filter) => {
      const stat = typeof filter.stat === 'string' ? filter.stat.toLowerCase() : null
      const operator = typeof filter.check === 'string'
        ? filter.check
        : typeof filter.comparison === 'string'
          ? filter.comparison
          : '>='
      const rawValue = typeof filter.score === 'number'
        ? filter.score
        : typeof filter.check === 'number'
          ? filter.check
          : null

      if (!stat || rawValue === null) {
        return null
      }

      return {
        stat,
        operator,
        value: rawValue,
      }
    })
    .filter(Boolean)

  return qualifiers.length > 0 ? qualifiers : null
}

function parsePerHeroExpr(expr) {
  if (typeof expr !== 'string') {
    return null
  }

  const trimmed = expr.trim()
  if (!trimmed || trimmed === 'true') {
    return {}
  }

  if (trimmed === '0') {
    return null
  }

  const tagMatches = [...trimmed.matchAll(/HasTag\(`([^`]+)`\)/g)].map((match) => match[1])
  const statMatch = trimmed.match(/^GetStat\(`([A-Za-z_]+)`\)\s*(>=|<=|>|<|==)\s*(\d+)$/)
  const ageMatch = trimmed.match(/^age\s*(>=|<=|>|<|==)\s*(\d+)$/)
  const ageWithExcludeMatch = trimmed.match(/^age\s*(>=|<=|>|<|==)\s*(\d+)\s*&&\s*hero_id!=([0-9]+)$/)

  if (tagMatches.length > 0 && !trimmed.includes('GetStat') && !trimmed.includes('age')) {
    return {
      requiredTags: [...new Set(tagMatches)],
      matchMode: 'any',
    }
  }

  if (statMatch) {
    return {
      requiredStats: [
        {
          stat: statMatch[1].toLowerCase(),
          operator: statMatch[2],
          value: Number(statMatch[3]),
        },
      ],
    }
  }

  if (ageWithExcludeMatch) {
    const operator = ageWithExcludeMatch[1]
    const value = Number(ageWithExcludeMatch[2])
    return {
      ...(operator === '>=' || operator === '>'
        ? { minAge: value }
        : { maxAge: value }),
      excludedHeroIds: [ageWithExcludeMatch[3]],
    }
  }

  if (ageMatch) {
    const operator = ageMatch[1]
    const value = Number(ageMatch[2])
    return {
      ...(operator === '>=' || operator === '>'
        ? { minAge: value }
        : { maxAge: value }),
    }
  }

  return null
}

function attachSignalSemantics(signal, effect) {
  const tagQualifier = normalizeTargetQualifier(effect)
  const statQualifiers = normalizeStatQualifiers(effect)
  const perHeroQualifier = parsePerHeroExpr(effect?.per_hero_expr)
  const heroQualifierFromFilters = (tagQualifier || statQualifiers)
    ? {
        ...(tagQualifier ?? {}),
        ...(statQualifiers ? { requiredStats: statQualifiers } : {}),
      }
    : null
  const useFormationCountQualifier = typeof effect?.stack_func === 'string'

  return {
    ...signal,
    targetQualifier: useFormationCountQualifier ? null : heroQualifierFromFilters,
    formationCountQualifier: perHeroQualifier ?? (useFormationCountQualifier ? heroQualifierFromFilters : null),
    amountFunc: normalizeAmountFunc(effect?.amount_func),
    stackFunc: typeof effect?.stack_func === 'string' ? effect.stack_func : null,
    applyManually: effect?.apply_manually === true,
    stacksMultiply: typeof effect?.stacks_multiply === 'boolean' ? effect.stacks_multiply : null,
    excludeSelf: effect?.exclude_self === true,
  }
}

function splitEffectString(effectString) {
  if (typeof effectString !== 'string' || effectString.trim().length === 0) {
    return null
  }

  const [effectName, effectValue = '1'] = effectString.split(',', 2)
  return { effectName, effectValue }
}

function getRolePriorityMultiplier(roles) {
  const normalizedRoles = new Set((roles ?? []).map((role) => String(role).toLowerCase()))

  if (normalizedRoles.has('dps')) return 4
  if (normalizedRoles.has('support')) return 2.5
  if (normalizedRoles.has('tanking')) return 1.5
  if (normalizedRoles.has('healing')) return 1.3
  if (normalizedRoles.has('gold')) return 1.2
  return 1.05
}

function collectHeroEffectEntries(detail) {
  const effectEntries = []

  for (const upgrade of detail.upgrades ?? []) {
    if (typeof upgrade.effectReference === 'string') {
      effectEntries.push({ effectString: upgrade.effectReference, effect: upgrade })
    }

    const effectKeys = upgrade.effectDefinition?.snapshots?.original?.effect_keys
    if (Array.isArray(effectKeys)) {
      for (const effectKey of effectKeys) {
        if (typeof effectKey?.effect_string === 'string') {
          effectEntries.push({ effectString: effectKey.effect_string, effect: effectKey })
        }
      }
    }
  }

  for (const lootItem of detail.loot ?? []) {
    for (const effect of lootItem.effects ?? []) {
      if (typeof effect?.effect_string === 'string') {
        effectEntries.push({ effectString: effect.effect_string, effect })
      }
    }
  }

  for (const legendaryEffect of detail.legendaryEffects ?? []) {
    for (const effect of legendaryEffect.effects ?? []) {
      if (typeof effect?.effect_string === 'string') {
        effectEntries.push({ effectString: effect.effect_string, effect })
      }
    }
  }

  return effectEntries
}

function buildOfficialPlannerHeroModel(champion, detail) {
  const carrySignals = []
  const supportSignals = []
  const unsupportedSignals = []

  for (const entry of collectHeroEffectEntries(detail)) {
    const split = splitEffectString(entry.effectString)

    if (!split) {
      continue
    }

    const parsed = normalizeEffectSignal(split.effectName, split.effectValue, 'official-parsed')

    if (parsed.ok) {
      const signal = attachSignalSemantics(parsed.signal, entry.effect)
      if (parsed.bucket === 'carrySignals') {
        carrySignals.push(signal)
      } else {
        supportSignals.push(signal)
      }
    } else {
      unsupportedSignals.push(parsed.unsupported)
    }
  }

  const heuristicRoleMultiplier = getRolePriorityMultiplier(champion.roles)

  return {
    heroId: champion.id,
    name: champion.name,
    seat: champion.seat,
    roles: champion.roles,
    tags: champion.tags,
    age: typeof detail.characterSheet?.age === 'number' ? detail.characterSheet.age : null,
    abilityScores: detail.characterSheet?.abilityScores ?? {},
    isCarryViable: champion.roles.some((role) => String(role).toLowerCase() === 'dps'),
    heuristicRoleMultiplier,
    carrySignals,
    supportSignals,
    unsupportedSignals,
    sourceBreakdown: {
      isCarryViable: 'official-parsed',
      heuristicRoleMultiplier: 'heuristic-fallback',
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

function buildOfficialPlannerScenarioModel(variant, formations) {
  const formation = findFormationForVariant(formations, variant)

  return {
    variantId: variant.id,
    scenarioRef: { kind: 'variant', id: variant.id },
    name: variant.name,
    formationLayoutId: formation?.id ?? null,
    objectiveArea: variant.objectiveArea ?? null,
    slotTopology: formation
      ? formation.slots.map((slot) => ({
          slotId: slot.id,
          row: slot.row,
          column: slot.column,
          adjacentSlotIds: slot.adjacentSlotIds ?? [],
        }))
      : [],
    forcedHeroes: [],
    bannedHeroes: [],
    lockedSlots: [],
    scenarioWarnings: [
      ...(variant.restrictions.length > 0 || variant.mechanics.length > 0
        ? ['当前推荐尚未解析场景限制与机制，只按已拥有英雄、seat 合法性和阵型槽位计算。']
        : []),
      ...(formation ? [] : ['当前场景没有匹配的阵型布局。']),
    ],
  }
}

function normalizePlannerSemanticOverrides(rawOverrides, updatedAt) {
  const items = Object.entries(rawOverrides.heroOverrides ?? {}).map(([heroId, patch]) => ({
    heroId,
    isCarryViable: patch?.isCarryViable,
    carrySignals: Array.isArray(patch?.carrySignals) ? patch.carrySignals : undefined,
    supportSignals: Array.isArray(patch?.supportSignals) ? patch.supportSignals : undefined,
    unsupportedSignals: Array.isArray(patch?.unsupportedSignals) ? patch.unsupportedSignals : undefined,
  }))

  return {
    items,
    updatedAt,
  }
}

export async function buildPlannerModels(options = {}) {
  const versionDir = path.resolve(options.versionDir ?? DEFAULT_VERSION_DIR)
  const semanticOverridesFile = path.resolve(
    options.semanticOverridesFile ?? DEFAULT_SEMANTIC_OVERRIDES,
  )
  const champions = await readJson(path.join(versionDir, 'champions.json'))
  const variants = await readJson(path.join(versionDir, 'variants.json'))
  const formations = await readJson(path.join(versionDir, 'formations.json'))
  const semanticOverrides = await readJson(semanticOverridesFile).catch(() => ({ heroOverrides: {} }))
  const updatedAt = champions.updatedAt ?? variants.updatedAt ?? formations.updatedAt ?? ''

  const plannerHeroes = []
  for (const champion of champions.items ?? []) {
    const detail = await readJson(path.join(versionDir, 'champion-details', `${champion.id}.json`))
    plannerHeroes.push(buildOfficialPlannerHeroModel(champion, detail))
  }

  const plannerScenarios = (variants.items ?? []).map((variant) =>
    buildOfficialPlannerScenarioModel(variant, formations.items ?? []),
  )

  await writeJson(path.join(versionDir, 'planner-heroes.json'), {
    items: plannerHeroes,
    updatedAt,
  })
  await writeJson(path.join(versionDir, 'planner-scenarios.json'), {
    items: plannerScenarios,
    updatedAt,
  })
  await writeJson(
    path.join(versionDir, 'planner-semantic-overrides.json'),
    normalizePlannerSemanticOverrides(semanticOverrides, updatedAt),
  )

  return {
    versionDir,
    updatedAt,
    heroCount: plannerHeroes.length,
    scenarioCount: plannerScenarios.length,
  }
}

async function main() {
  const result = await buildPlannerModels()

  console.log('planner model 构建完成：')
  console.log(`- version dir: ${result.versionDir}`)
  console.log(`- updatedAt: ${result.updatedAt}`)
  console.log(`- heroes: ${result.heroCount}`)
  console.log(`- scenarios: ${result.scenarioCount}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`构建 planner model 失败：${error.message}`)
    process.exitCode = 1
  })
}
