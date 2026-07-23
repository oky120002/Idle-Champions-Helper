import {
  compareLocalizedText,
  normalizeLocalizedText,
  normalizeLocalizedTextList,
  normalizeNumber,
  normalizeOptionalLocalizedText,
  toLocalizedOverrideList,
  toText,
  toTextList,
  toStringList,
  uniqueLocalizedTexts,
  uniqueNumbers,
  uniqueStrings,
} from './normalize-text-utils.ts'
import { looksLikeVariant } from './formation-layout-helpers.mjs'
import {
  buildScenarioModeTags,
  buildScenarioRuleContextId,
  normalizePatronDefinition,
  normalizePatronObjectiveTiers,
} from './official-rule-helpers.mjs'

/**
 * 场景/冒险域：affiliation/campaign/adventure/scene map + adventure/variant 归一化 +
 * area highlight + monster 目录 + patron。从 normalize-idle-champions-definitions 拆出。
 */

const GENERIC_MONSTER_TAGS = new Set([
  'melee',
  'ranged',
  'boss',
  'hits_based',
  'armor_based',
  'static',
  'flying',
])

const SPECIAL_MONSTER_TAGS = new Set(['boss', 'hits_based', 'armor_based', 'static'])

const MAGIC_ATTACK_HINTS = [
  'missile',
  'bolt',
  'fireball',
  'magic',
  'ray',
  'breath',
  'lightning',
  'poison',
  'necrotic',
  'witch',
  'spell',
  'arcane',
]

const STRUCTURAL_VARIANT_GAME_CHANGES = new Set([
  'formation',
  'formation_saves_campaign_id',
  'initial_formation',
])

function buildVariantEnemySummary(originalDefinition, baseAdventureId, monsterCatalog) {
  const pool = new Map()

  for (const monster of monsterCatalog.monstersByAdventureId.get(baseAdventureId) ?? []) {
    pool.set(getMonsterIdentityKey(monster), monster)
  }

  for (const monsterId of collectMonsterIdsFromGameChange(originalDefinition.game_changes ?? [])) {
    const monster = monsterCatalog.monstersById.get(monsterId)

    if (monster) {
      pool.set(getMonsterIdentityKey(monster), monster)
    }
  }

  const attackMix = { melee: 0, ranged: 0, magic: 0, other: 0 }
  const enemyTypeCounts = new Map()
  let specialEnemyCount = 0

  for (const monster of pool.values()) {
    attackMix[monster.attackType] += 1

    if (monster.isSpecial) {
      specialEnemyCount += 1
    }

    for (const tag of monster.tags) {
      if (GENERIC_MONSTER_TAGS.has(tag)) {
        continue
      }

      enemyTypeCounts.set(tag, (enemyTypeCounts.get(tag) ?? 0) + 1)
    }
  }

  const escortCount = collectEscortNames(originalDefinition.game_changes ?? []).length

  return {
    enemyCount: pool.size,
    enemyTypes: Array.from(enemyTypeCounts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([tag]) => tag),
    enemyTypeCounts: Object.fromEntries(
      Array.from(enemyTypeCounts.entries()).sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      ),
    ),
    attackMix,
    specialEnemyCount: specialEnemyCount + escortCount,
    escortCount,
  }
}

export function buildVariantMetadataMap(originalDefinitions, localizedDefinitions, campaignMap, monsterCatalog) {
  const adventureMap = buildAdventureMap(originalDefinitions, localizedDefinitions, campaignMap)
  const sceneMap = buildSceneMap(adventureMap)
  const metadataById = new Map()

  for (const definition of originalDefinitions) {
    if (!looksLikeVariant(definition)) {
      continue
    }

    const variantId = String(definition.id)
    const baseAdventureId =
      definition.variant_adventure_id !== undefined
        ? String(definition.variant_adventure_id)
        : null
    const adventure = baseAdventureId ? adventureMap.get(baseAdventureId) ?? null : null
    const sceneKey =
      adventure?.locationId ? `${adventure.campaign.id}:${adventure.locationId}` : null
    const scene = sceneKey ? sceneMap.get(sceneKey) ?? null : null
    const objectiveArea = extractObjectiveArea(definition)
    const areaHighlights = collectAreaHighlights(definition.game_changes ?? [])
    const enemySummary = buildVariantEnemySummary(definition, baseAdventureId ?? '', monsterCatalog)
    const mechanics = uniqueStrings(
      (definition.game_changes ?? [])
        .map((gameChange) => toText(gameChange.type))
        .filter(Boolean),
    )
      .filter((gameChangeType) => !STRUCTURAL_VARIANT_GAME_CHANGES.has(gameChangeType))
      .sort((left, right) => left.localeCompare(right))

    metadataById.set(variantId, {
      adventureId: baseAdventureId,
      adventure: adventure?.name ?? null,
      objectiveArea,
      locationId: adventure?.locationId ?? null,
      areaSetId: adventure?.areaSetId ?? null,
      scene,
      areaHighlights,
      areaMilestones: uniqueNumbers([
        objectiveArea ?? -1,
        ...areaHighlights.map((highlight) => highlight.start),
      ]),
      mechanics,
      ...enemySummary,
      ...collectHeroRestrictions(definition.game_changes ?? []),
    })
  }

  return metadataById
}

export function normalizeAdventure(
  originalDefinition,
  localizedDefinition,
  adventureMetadata,
  scene,
) {
  const originalRequirements = uniqueStrings([
    ...toTextList(originalDefinition.requirements_text),
    ...toTextList(originalDefinition.requirements_description),
  ])
  const displayRequirements = uniqueStrings([
    ...toTextList(localizedDefinition?.requirements_text),
    ...toTextList(localizedDefinition?.requirements_description),
  ])
  const originalRestrictions = uniqueStrings([
    ...toTextList(originalDefinition.restrictions_text),
    ...toTextList(originalDefinition.restrictions),
  ])
  const displayRestrictions = uniqueStrings([
    ...toTextList(localizedDefinition?.restrictions_text),
    ...toTextList(localizedDefinition?.restrictions),
  ])
  const originalRewards = uniqueStrings([
    ...toTextList(originalDefinition.reward_description),
    ...toTextList(originalDefinition.reward_descriptions),
    ...toTextList(originalDefinition.rewards_text),
    ...toTextList(originalDefinition.rewards),
  ])
  const displayRewards = uniqueStrings([
    ...toTextList(localizedDefinition?.reward_description),
    ...toTextList(localizedDefinition?.reward_descriptions),
    ...toTextList(localizedDefinition?.rewards_text),
    ...toTextList(localizedDefinition?.rewards),
  ])
  const patronObjectiveTiers = normalizePatronObjectiveTiers(originalDefinition.patron_objectives)
  const repeatable = Boolean(originalDefinition.repeatable)

  return {
    id: String(originalDefinition.id),
    ruleContextId: buildScenarioRuleContextId('adventure', String(originalDefinition.id)),
    scenarioKind: 'adventure',
    name: normalizeLocalizedText(
      originalDefinition.name,
      localizedDefinition?.name,
      `Adventure ${originalDefinition.id}`,
    ),
    campaign: adventureMetadata.campaign,
    description: normalizeOptionalLocalizedText(
      originalDefinition.description,
      localizedDefinition?.description,
    ),
    objectiveArea: adventureMetadata.objectiveArea ?? null,
    locationId: adventureMetadata.locationId ?? null,
    areaSetId: adventureMetadata.areaSetId ?? null,
    scene,
    requirements: normalizeLocalizedTextList(originalRequirements, displayRequirements),
    restrictions: normalizeLocalizedTextList(originalRestrictions, displayRestrictions),
    rewards: normalizeLocalizedTextList(originalRewards, displayRewards),
    repeatable,
    patronObjectiveTiers,
    modeTags: buildScenarioModeTags('adventure', repeatable, patronObjectiveTiers),
    mechanics: collectScenarioMechanics(originalDefinition.game_changes ?? []),
  }
}

export function normalizeVariant(originalDefinition, localizedDefinition, campaignMap, variantMetadataById) {
  const originalRestrictions = uniqueStrings([
    ...toTextList(originalDefinition.requirements_text),
    ...toTextList(originalDefinition.requirements_description),
    ...toTextList(originalDefinition.restrictions_text),
    ...toTextList(originalDefinition.restrictions),
  ])
  const displayRestrictions = uniqueStrings([
    ...toTextList(localizedDefinition?.requirements_text),
    ...toTextList(localizedDefinition?.requirements_description),
    ...toTextList(localizedDefinition?.restrictions_text),
    ...toTextList(localizedDefinition?.restrictions),
  ])
  const originalRewards = uniqueStrings([
    ...toTextList(originalDefinition.reward_description),
    ...toTextList(originalDefinition.reward_descriptions),
    ...toTextList(originalDefinition.rewards_text),
    ...toTextList(originalDefinition.rewards),
  ])
  const displayRewards = uniqueStrings([
    ...toTextList(localizedDefinition?.reward_description),
    ...toTextList(localizedDefinition?.reward_descriptions),
    ...toTextList(localizedDefinition?.rewards_text),
    ...toTextList(localizedDefinition?.rewards),
  ])
  const campaign =
    campaignMap.get(String(originalDefinition.campaign_id ?? '')) ?? {
      id: String(originalDefinition.campaign_id ?? ''),
      original: String(originalDefinition.campaign_id ?? ''),
      display: String(originalDefinition.campaign_id ?? ''),
    }
  const metadata = variantMetadataById.get(String(originalDefinition.id)) ?? {}
  const patronObjectiveTiers = normalizePatronObjectiveTiers(originalDefinition.patron_objectives)
  const repeatable = Boolean(originalDefinition.repeatable)

  return {
    id: String(originalDefinition.id),
    ruleContextId: buildScenarioRuleContextId('variant', String(originalDefinition.id)),
    scenarioKind: 'variant',
    name: normalizeLocalizedText(
      originalDefinition.name,
      localizedDefinition?.name,
      `Variant ${originalDefinition.id}`,
    ),
    campaign,
    adventureId: metadata.adventureId ?? null,
    adventure: metadata.adventure ?? null,
    objectiveArea: metadata.objectiveArea ?? null,
    locationId: metadata.locationId ?? null,
    areaSetId: metadata.areaSetId ?? null,
    scene: metadata.scene ?? null,
    restrictions: normalizeLocalizedTextList(originalRestrictions, displayRestrictions),
    rewards: normalizeLocalizedTextList(originalRewards, displayRewards),
    repeatable,
    patronObjectiveTiers,
    modeTags: buildScenarioModeTags('variant', repeatable, patronObjectiveTiers),
    enemyCount: metadata.enemyCount ?? 0,
    enemyTypes: metadata.enemyTypes ?? [],
    enemyTypeCounts: metadata.enemyTypeCounts ?? {},
    attackMix: metadata.attackMix ?? {
      melee: 0,
      ranged: 0,
      magic: 0,
      other: 0,
    },
    specialEnemyCount: metadata.specialEnemyCount ?? 0,
    escortCount: metadata.escortCount ?? 0,
    areaHighlights: metadata.areaHighlights ?? [],
    areaMilestones: metadata.areaMilestones ?? [],
    mechanics: metadata.mechanics ?? [],
    forcedHeroIds: metadata.forcedHeroIds ?? [],
    allowedHeroIds: metadata.allowedHeroIds ?? [],
    allowedTags: metadata.allowedTags ?? [],
  }
}

export function mergeVariants(autoVariants, manualVariants) {
  const merged = new Map(autoVariants.map((variant) => [variant.id, variant]))

  for (const variant of manualVariants) {
    const id = String(variant.id)
    merged.set(id, {
      ...merged.get(id),
      ...variant,
      id,
      restrictions: uniqueLocalizedTexts([
        ...(merged.get(id)?.restrictions ?? []),
        ...toLocalizedOverrideList(variant.restrictions),
      ]),
      rewards: uniqueLocalizedTexts([
        ...(merged.get(id)?.rewards ?? []),
        ...toLocalizedOverrideList(variant.rewards),
      ]),
    })
  }

  return Array.from(merged.values()).sort((left, right) => Number(left.id) - Number(right.id))
}

export function normalizeManualFormations(formations = []) {
  return formations
    .map((formation) => {
      const name =
        typeof formation.name === 'object' && formation.name !== null
          ? normalizeLocalizedText(
              formation.name.original,
              formation.name.display,
              formation.id,
            )
          : normalizeLocalizedText(formation.name, formation.name, formation.id)

      return {
        id: String(formation.id),
        name,
        notes:
          typeof formation.notes === 'object' && formation.notes !== null
            ? normalizeLocalizedText(formation.notes.original, formation.notes.display)
            : normalizeLocalizedText(formation.notes, formation.notes),
        slots: Array.isArray(formation.slots)
          ? formation.slots.map((slot) => ({
              id: String(slot.id),
              row: Number(slot.row),
              column: Number(slot.column),
              x: Number.isFinite(Number(slot.x)) ? Number(slot.x) : undefined,
              y: Number.isFinite(Number(slot.y)) ? Number(slot.y) : undefined,
              adjacentSlotIds: Array.isArray(slot.adjacentSlotIds)
                ? slot.adjacentSlotIds.map((value) => String(value))
                : undefined,
            }))
          : [],
        applicableContexts: Array.isArray(formation.applicableContexts)
          ? formation.applicableContexts
              .filter((context) => context?.kind && context?.id !== undefined)
              .map((context) => ({
                kind: String(context.kind),
                id: String(context.id),
              }))
          : undefined,
        sourceContexts: Array.isArray(formation.sourceContexts)
          ? formation.sourceContexts
              .filter((context) => context?.kind && context?.id !== undefined && context?.name)
              .map((context) => {
                const contextName = normalizeLocalizedText(
                  context.name.original,
                  context.name.display,
                  `${context.kind}-${context.id}`,
                )

                if (!contextName) {
                  return null
                }

                return {
                  kind: String(context.kind),
                  id: String(context.id),
                  name: contextName,
                  campaignId:
                    context.campaignId !== undefined ? String(context.campaignId) : undefined,
                  variantAdventureId:
                    context.variantAdventureId !== undefined
                      ? String(context.variantAdventureId)
                      : undefined,
                }
              })
              .filter(Boolean)
          : undefined,
      }
    })
    .filter((formation) => formation.name)
    .sort((left, right) => compareLocalizedText(left.name, right.name))
}

function stripAdventureFlavor(value) {
  const text = toText(value)

  if (!text) {
    return null
  }

  return text
    .replace(/^Time Gate\s*-\s*/i, '')
    .replace(/^时空门\s*-\s*/u, '')
    .replace(/\s*[（(][^()（）]+[)）]\s*$/u, '')
    .trim()
}

function extractObjectiveArea(definition = {}) {
  const directObjective = (definition.objectives ?? []).find((item) =>
    ['area', 'complete_area'].includes(item?.condition),
  )
  const directArea = normalizeNumber(directObjective?.area)

  if (directArea !== null) {
    return directArea
  }

  const objectiveText = toText(definition.objectives_text)

  if (!objectiveText) {
    return null
  }

  const match = objectiveText.match(/(\d+)/)
  return match ? normalizeNumber(match[1]) : null
}

function collectEscortNames(gameChanges = []) {
  const names = []

  function visit(value, currentType = null) {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, currentType)
      }

      return
    }

    if (!value || typeof value !== 'object') {
      return
    }

    const nextType = typeof value.type === 'string' ? value.type : currentType

    if (
      nextType &&
      nextType.startsWith('slot_escort') &&
      Array.isArray(value.names)
    ) {
      names.push(...toTextList(value.names))
    }

    for (const item of Object.values(value)) {
      visit(item, nextType)
    }
  }

  visit(gameChanges)
  return uniqueStrings(names)
}

function collectHeroRestrictions(gameChanges = []) {
  const forcedHeroIds = new Set()
  const allowedHeroIds = new Set()
  const allowedTags = new Set()
  let hasAllowed = false

  for (const change of gameChanges) {
    if (!change || typeof change !== 'object') {
      continue
    }
    const type = typeof change.type === 'string' ? change.type : null

    if (type === 'force_use_heroes' && Array.isArray(change.hero_ids)) {
      for (const id of change.hero_ids) {
        if (id !== undefined && id !== null) {
          forcedHeroIds.add(String(id))
        }
      }
    }

    if (type === 'only_allow_crusaders') {
      hasAllowed = true
      const ids = change.by_ids?.ids
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (id !== undefined && id !== null) {
            allowedHeroIds.add(String(id))
          }
        }
      }
      const tags = change.by_tags?.tags
      if (typeof tags === 'string') {
        for (const tag of tags.split('|')) {
          const trimmed = tag.trim()
          if (trimmed) {
            allowedTags.add(trimmed)
          }
        }
      }
    }
  }

  return {
    forcedHeroIds: [...forcedHeroIds],
    allowedHeroIds: hasAllowed ? [...allowedHeroIds] : [],
    allowedTags: hasAllowed ? [...allowedTags] : [],
  }
}

function buildAreaHighlightId(entry) {
  return [
    entry.kind,
    entry.start ?? 'open',
    entry.end ?? 'open',
    entry.loopAt ?? 'loop',
    entry.repeatAt ?? 'repeat',
  ].join(':')
}

function pushAreaHighlight(result, entry) {
  const start =
    normalizeNumber(entry.start) ??
    normalizeNumber(entry.end)

  if (start === null) {
    return
  }

  const normalizedEntry = {
    id: buildAreaHighlightId({
      ...entry,
      start,
      end: normalizeNumber(entry.end),
    }),
    kind: entry.kind,
    start,
    end: normalizeNumber(entry.end),
    loopAt: normalizeNumber(entry.loopAt),
    repeatAt: normalizeNumber(entry.repeatAt),
  }

  if (!result.has(normalizedEntry.id)) {
    result.set(normalizedEntry.id, normalizedEntry)
  }
}

function parseAreaRange(rangeText) {
  const normalized = toText(rangeText)

  if (!normalized) {
    return null
  }

  const parts = normalized
    .split(/[,-]/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (parts.length !== 2) {
    return null
  }

  const start = normalizeNumber(parts[0])
  const end = normalizeNumber(parts[1])

  if (start === null && end === null) {
    return null
  }

  return { start, end }
}

function collectAreaHighlights(gameChanges = []) {
  const highlights = new Map()

  function visit(value, context) {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, context)
      }

      return
    }

    if (!value || typeof value !== 'object') {
      return
    }

    const loopAt = normalizeNumber(value.loop_at) ?? context.loopAt
    const repeatAt = normalizeNumber(value.repeat_at) ?? context.repeatAt
    const minArea = normalizeNumber(value.min_area)
    const maxArea = normalizeNumber(value.max_area)
    const startArea = normalizeNumber(value.start_area)
    const endArea = normalizeNumber(value.end_area)
    const areaRange = parseAreaRange(value.area_range)

    if (minArea !== null || maxArea !== null) {
      pushAreaHighlight(highlights, {
        kind: context.kind,
        start: minArea,
        end: maxArea,
        loopAt,
        repeatAt,
      })
    }

    if (startArea !== null || endArea !== null) {
      pushAreaHighlight(highlights, {
        kind: context.kind,
        start: startArea,
        end: endArea,
        loopAt,
        repeatAt,
      })
    }

    if (areaRange) {
      pushAreaHighlight(highlights, {
        kind: context.kind,
        start: areaRange.start,
        end: areaRange.end,
        loopAt,
        repeatAt,
      })
    }

    for (const item of Object.values(value)) {
      visit(item, {
        kind: context.kind,
        loopAt,
        repeatAt,
      })
    }
  }

  for (const gameChange of gameChanges) {
    visit(gameChange, {
      kind: toText(gameChange.type) ?? 'effect',
      loopAt: normalizeNumber(gameChange.loop_at),
      repeatAt: normalizeNumber(gameChange.repeat_at),
    })
  }

  return Array.from(highlights.values()).sort(
    (left, right) =>
      left.start - right.start ||
      (left.end ?? Number.MAX_SAFE_INTEGER) - (right.end ?? Number.MAX_SAFE_INTEGER) ||
      left.kind.localeCompare(right.kind),
  )
}

function classifyMonsterAttack(monster, attackDefinitionsById) {
  const tags = new Set(toStringList(monster.tags))

  if (tags.has('melee')) {
    return 'melee'
  }

  if (tags.has('ranged')) {
    return 'ranged'
  }

  const attackId = monster.attack_id !== undefined ? String(monster.attack_id) : null
  const attackName = attackId ? toText(attackDefinitionsById.get(attackId)?.name)?.toLowerCase() ?? '' : ''

  if (attackName.includes('melee')) {
    return 'melee'
  }

  if (attackName.includes('ranged')) {
    return 'ranged'
  }

  if (MAGIC_ATTACK_HINTS.some((hint) => attackName.includes(hint))) {
    return 'magic'
  }

  return 'other'
}

function normalizeMonsterIdentity(monster, attackDefinitionsById) {
  const tags = uniqueStrings(toStringList(monster.tags)).sort((left, right) => left.localeCompare(right))
  const attackType = classifyMonsterAttack(monster, attackDefinitionsById)

  return {
    id: String(monster.id),
    name: toText(monster.name) ?? `Monster ${monster.id}`,
    tags,
    attackType,
    isSpecial: tags.some((tag) => SPECIAL_MONSTER_TAGS.has(tag)),
  }
}

export function buildMonsterCatalog(rawDefinitions, attackDefinitionsById) {
  const monstersById = new Map()
  const monstersByAdventureId = new Map()

  for (const definition of rawDefinitions.monster_defines ?? []) {
    const monster = normalizeMonsterIdentity(definition, attackDefinitionsById)
    monstersById.set(monster.id, monster)

    for (const adventureId of uniqueStrings(toStringList(definition.adventures))) {
      const existing = monstersByAdventureId.get(adventureId) ?? []
      existing.push(monster)
      monstersByAdventureId.set(adventureId, existing)
    }
  }

  return {
    monstersById,
    monstersByAdventureId,
  }
}

function getMonsterIdentityKey(monster) {
  return `${monster.name}\u0000${monster.attackType}\u0000${monster.tags.join('|')}`
}

function collectMonsterIdsFromGameChange(value, result = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectMonsterIdsFromGameChange(item, result)
    }

    return result
  }

  if (!value || typeof value !== 'object') {
    return result
  }

  for (const [key, item] of Object.entries(value)) {
    if (key === 'monster_id') {
      const monsterId = normalizeNumber(item)

      if (monsterId !== null) {
        result.add(String(monsterId))
      }

      continue
    }

    if (key === 'monster_ids' || key === 'boss_ids') {
      for (const monsterId of toStringList(item)) {
        result.add(monsterId)
      }

      continue
    }

    if (key === 'monster_replacements_by_id' && item && typeof item === 'object') {
      for (const replacementId of Object.values(item)) {
        const normalized = normalizeNumber(replacementId)

        if (normalized !== null) {
          result.add(String(normalized))
        }
      }

      continue
    }

    collectMonsterIdsFromGameChange(item, result)
  }

  return result
}

export function buildAffiliationMap(originalDefinitions = [], localizedDefinitions = []) {
  const originalByTag = new Map()
  const localizedByTag = new Map()

  for (const definition of originalDefinitions) {
    const tag = definition.affiliation_tag ?? definition.tag ?? definition.key

    if (!tag) {
      continue
    }

    originalByTag.set(String(tag), definition)
  }

  for (const definition of localizedDefinitions) {
    const tag = definition.affiliation_tag ?? definition.tag ?? definition.key

    if (!tag) {
      continue
    }

    localizedByTag.set(String(tag), definition)
  }

  const tags = Array.from(new Set([...originalByTag.keys(), ...localizedByTag.keys()]))

  return new Map(
    tags
      .map((tag) => {
        const originalDefinition = originalByTag.get(tag) ?? {}
        const localizedDefinition = localizedByTag.get(tag) ?? {}
        const name = normalizeLocalizedText(
          getDefinitionName(originalDefinition),
          getDefinitionName(localizedDefinition),
          tag,
        )

        if (!name) {
          return null
        }

        return [tag, name]
      })
      .filter(Boolean),
  )
}

export function buildCampaignMap(originalDefinitions = [], localizedDefinitions = []) {
  const originalById = new Map()
  const localizedById = new Map()

  for (const definition of originalDefinitions) {
    const id = definition.id ?? definition.campaign_id

    if (id === undefined) {
      continue
    }

    originalById.set(String(id), definition)
  }

  for (const definition of localizedDefinitions) {
    const id = definition.id ?? definition.campaign_id

    if (id === undefined) {
      continue
    }

    localizedById.set(String(id), definition)
  }

  const ids = Array.from(new Set([...originalById.keys(), ...localizedById.keys()]))

  return new Map(
    ids
      .map((id) => {
        const originalDefinition = originalById.get(id) ?? {}
        const localizedDefinition = localizedById.get(id) ?? {}
        const name = normalizeLocalizedText(
          getDefinitionName(originalDefinition),
          getDefinitionName(localizedDefinition),
          `Campaign ${id}`,
        )

        if (!name) {
          return null
        }

        return [
          id,
          {
            id,
            ...name,
          },
        ]
      })
      .filter(Boolean),
  )
}

export function buildIdMap(definitions = []) {
  const result = new Map()

  for (const definition of definitions) {
    const id = definition?.id

    if (id === undefined) {
      continue
    }

    result.set(String(id), definition)
  }

  return result
}

export function buildAdventureMap(originalDefinitions = [], localizedDefinitions = [], campaignMap) {
  const originalById = buildIdMap(originalDefinitions)
  const localizedById = buildIdMap(localizedDefinitions)
  const ids = Array.from(new Set([...originalById.keys(), ...localizedById.keys()]))

  return new Map(
    ids
      .map((id) => {
        const originalDefinition = originalById.get(id) ?? {}
        const localizedDefinition = localizedById.get(id) ?? {}
        const campaignId = String(originalDefinition.campaign_id ?? localizedDefinition.campaign_id ?? '')
        const campaign =
          campaignMap.get(campaignId) ?? {
            id: campaignId,
            original: campaignId,
            display: campaignId,
          }
        const name = normalizeLocalizedText(
          getDefinitionName(originalDefinition),
          getDefinitionName(localizedDefinition),
          `Adventure ${id}`,
        )

        if (!name) {
          return null
        }

        const themeName = normalizeLocalizedText(
          stripAdventureFlavor(name.original),
          stripAdventureFlavor(name.display),
          name.original,
        )

        return [
          id,
          {
            id,
            name,
            themeName: themeName ?? name,
            campaign,
            locationId:
              originalDefinition.location_id !== undefined
                ? String(originalDefinition.location_id)
                : null,
            areaSetId:
              originalDefinition.area_set_id !== undefined
                ? String(originalDefinition.area_set_id)
                : null,
            objectiveArea: extractObjectiveArea(originalDefinition),
            variantAdventureId:
              originalDefinition.variant_adventure_id !== undefined
                ? String(originalDefinition.variant_adventure_id)
                : null,
            isVariant: looksLikeVariant(originalDefinition),
          },
        ]
      })
      .filter(Boolean),
  )
}

export function buildSceneMap(adventureMap) {
  const groupedScenes = new Map()

  for (const adventure of adventureMap.values()) {
    if (adventure.isVariant || !adventure.locationId) {
      continue
    }

    const key = `${adventure.campaign.id}:${adventure.locationId}`
    const current = groupedScenes.get(key)

    if (!current || Number(adventure.id) < Number(current.sourceAdventureId)) {
      groupedScenes.set(key, {
        id: key,
        original: adventure.themeName.original,
        display: adventure.themeName.display,
        sourceAdventureId: adventure.id,
      })
    }
  }

  return new Map(
    Array.from(groupedScenes.entries()).map(([key, value]) => [
      key,
      {
        id: key,
        original: value.original,
        display: value.display,
      },
    ]),
  )
}

export function normalizePatrons(originalDefinitions = [], localizedDefinitions = []) {
  const localizedById = buildIdMap(localizedDefinitions)

  return originalDefinitions
    .map((definition) =>
      normalizePatronDefinition(
        definition,
        localizedById.get(String(definition.id)) ?? definition,
      ),
    )
    .filter(Boolean)
    .sort((left, right) => Number(left.id) - Number(right.id))
}

function collectScenarioMechanics(gameChanges = []) {
  return uniqueStrings(
    (gameChanges ?? [])
      .map((gameChange) => toText(gameChange.type))
      .filter(Boolean),
  )
    .filter((gameChangeType) => !STRUCTURAL_VARIANT_GAME_CHANGES.has(gameChangeType))
    .sort((left, right) => left.localeCompare(right))
}

function getDefinitionName(definition = {}) {
  return definition.name ?? definition.label ?? definition.campaign_name
}
