import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { readJson, readJsonIfExists, writeJson } from './data/io-utils.mjs'
import {
  compareLocalizedText,
  normalizeJsonValue,
  normalizeLocalizedText,
  normalizeLocalizedTextList,
  normalizeNumber,
  normalizeNumberList,
  normalizeOptionalLocalizedText,
  toLocalizedOverrideList,
  toText,
  toTextList,
  toStringList,
  uniqueLocalizedTexts,
  uniqueNumbers,
  uniqueStrings,
} from './data/normalize-text-utils.mjs'
import {
  normalizeChampion,
  normalizeChampionDetail,
  normalizeChampionVisual,
  normalizeChampionVisualSkin,
} from './data/normalize-champions.mjs'
import {
  DEFAULT_MASTER_API_URL,
  buildChampionPortraitPath,
  buildGraphicMap,
  collectChampionPortraitSources,
  isPlayableChampion,
  resolveGraphicAssetById,
} from './data/champion-asset-helpers.mjs'
import { extractOfficialFormations, looksLikeVariant } from './data/formation-layout-helpers.mjs'
import {
  buildChampionPatronEligibility,
  buildScenarioModeTags,
  buildScenarioRuleContextId,
  normalizeOfficialBuffDefinition,
  normalizeOfficialEffectKeyDefinition,
  normalizeOfficialGameRuleDefinition,
  normalizeOfficialStatDefinition,
  normalizePatronPerkDefinition,
  normalizePatronDefinition,
  normalizePatronPerkTierDefinition,
  normalizePatronObjectiveTiers,
  normalizeTrialsDifficultyDefinition,
  normalizeTrialsRoleDefinition,
} from './data/official-rule-helpers.mjs'

const DEFAULT_OUTPUT_DIR = 'public/data/v1'
const DEFAULT_VERSION_FILE = 'public/data/version.json'
const DEFAULT_MANUAL_OVERRIDES = 'scripts/data/manual-overrides.json'
const DEFAULT_CURRENT_VERSION = 'v1'
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

/**
 * 归一化 upgrade.effect 到标准 effect 引用串。
 *
 * CNE 数据源格式特性（非 bug，见 AGENTS.md 1.3）：upgrade_defines.effect 有时是
 * JSON 对象串（'{"effect_string":"buff_upgrade,...","description":"..."}'），序列化
 * 不稳定——357 条对象串中 19 条 effect_string 行末缺逗号为伪 JSON。内部 effect_string
 * 才是真正的 effect 定义；在归一化层统一提取，让下游消费方永远拿到干净的标准串
 * （'buff_upgrade,...'），不必各自处理伪 JSON。description / data 等元信息丢弃
 * （当前无下游消费）。
 */

function getDefinitionName(definition = {}) {
  return definition.name ?? definition.label ?? definition.campaign_name
}

function getUpdatedAt(rawDefinitions) {
  if (typeof rawDefinitions.current_time === 'number') {
    return new Date(rawDefinitions.current_time * 1000).toISOString().slice(0, 10)
  }

  return new Date().toISOString().slice(0, 10)
}

function buildAffiliationMap(originalDefinitions = [], localizedDefinitions = []) {
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

function buildCampaignMap(originalDefinitions = [], localizedDefinitions = []) {
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


function buildIdMap(definitions = []) {
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

function buildAdventureMap(originalDefinitions = [], localizedDefinitions = [], campaignMap) {
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

function buildSceneMap(adventureMap) {
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

function buildMonsterCatalog(rawDefinitions, attackDefinitionsById) {
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

/**
 * 从 game_changes 提取英雄限制（阶段 9.2）：
 * - force_use_heroes（{hero_ids:[N]}）→ forcedHeroIds
 * - only_allow_crusaders（{by_ids:{ids:[...]}, by_tags:{tags:"a|b"}}）→ allowedHeroIds + allowedTags（| 为 OR）
 * allowedHeroIds/allowedTags 仅在该变体含 only_allow_crusaders 时非空（hasAllowed 语义）。
 */
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

function buildVariantMetadataMap(originalDefinitions, localizedDefinitions, campaignMap, monsterCatalog) {
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

function groupDefinitionsByHeroId(definitions = []) {
  const result = new Map()

  for (const definition of definitions) {
    const heroId = definition?.hero_id

    if (heroId === undefined) {
      continue
    }

    const key = String(heroId)
    const existing = result.get(key) ?? []
    existing.push(definition)
    result.set(key, existing)
  }

  return result
}


function normalizePatrons(originalDefinitions = [], localizedDefinitions = []) {
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

function normalizeAdventure(
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

function normalizeVariant(originalDefinition, localizedDefinition, campaignMap, variantMetadataById) {
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

function mergeVariants(autoVariants, manualVariants) {
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

function normalizeManualFormations(formations = []) {
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

function mergeFormations(autoFormations, manualFormations) {
  const merged = new Map(autoFormations.map((formation) => [formation.id, formation]))

  for (const formation of manualFormations) {
    const existing = merged.get(formation.id)

    merged.set(formation.id, {
      ...existing,
      ...formation,
      id: formation.id,
      slots: formation.slots.length > 0 ? formation.slots : (existing?.slots ?? []),
      applicableContexts: formation.applicableContexts ?? existing?.applicableContexts,
      sourceContexts: formation.sourceContexts ?? existing?.sourceContexts,
    })
  }

  return Array.from(merged.values())
}

function normalizeEnums(champions, affiliationMap, campaignMap, patrons, adventures, variants) {
  const campaigns = Array.from(campaignMap.entries())
    .map(([, value]) => value)
    .sort((left, right) => Number(left.id) - Number(right.id))
  const modes = uniqueStrings([
    ...adventures.flatMap((adventure) => adventure.modeTags ?? []),
    ...variants.flatMap((variant) => variant.modeTags ?? []),
  ]).sort((left, right) => left.localeCompare(right))

  return [
    {
      id: 'roles',
      values: uniqueStrings(champions.flatMap((champion) => champion.roles)).sort((left, right) =>
        left.localeCompare(right),
      ),
    },
    {
      id: 'affiliations',
      values: uniqueLocalizedTexts(Array.from(affiliationMap.values())).sort(compareLocalizedText),
    },
    {
      id: 'campaigns',
      values: campaigns,
    },
    {
      id: 'patrons',
      values: patrons.map((patron) => ({
        id: patron.id,
        original: patron.name.original,
        display: patron.name.display,
      })),
    },
    {
      id: 'modes',
      values: modes,
    },
  ]
}

async function readManualOverrides(filePath) {
  // 文件可选：缺失（ENOENT）返回空默认；但 JSON 损坏必须抛错，避免静默丢失手工 override。
  const overrides = await readJsonIfExists(filePath)
  return overrides ?? { championOverrides: {}, variants: [], formations: [] }
}

export async function normalizeDefinitionsSnapshot(options = {}) {
  if (!options.input) {
    throw new Error('缺少 --input，无法归一化原始 definitions 快照')
  }

  const input = path.resolve(options.input)
  const outputDir = path.resolve(options.outputDir ?? DEFAULT_OUTPUT_DIR)
  const versionFile = path.resolve(options.versionFile ?? DEFAULT_VERSION_FILE)
  const currentVersion = options.currentVersion ?? DEFAULT_CURRENT_VERSION
  const manualOverridesFile = path.resolve(
    options.manualOverrides ?? DEFAULT_MANUAL_OVERRIDES,
  )

  const rawDefinitions = await readJson(input)
  const localizedDefinitions = options.localizedInput
    ? await readJson(path.resolve(options.localizedInput))
    : rawDefinitions
  const masterApiUrl = options.masterApiUrl ?? DEFAULT_MASTER_API_URL
  const manualOverrides = await readManualOverrides(manualOverridesFile)
  const updatedAt = getUpdatedAt(rawDefinitions)
  const affiliationMap = buildAffiliationMap(
    rawDefinitions.affiliation_defines,
    localizedDefinitions.affiliation_defines,
  )
  const campaignMap = buildCampaignMap(
    rawDefinitions.campaign_defines,
    localizedDefinitions.campaign_defines,
  )
  const adventureMap = buildAdventureMap(
    rawDefinitions.adventure_defines ?? [],
    localizedDefinitions.adventure_defines ?? [],
    campaignMap,
  )
  const sceneMap = buildSceneMap(adventureMap)
  const localizedChampionsById = new Map(
    (localizedDefinitions.hero_defines ?? []).map((definition) => [String(definition.id), definition]),
  )
  const localizedVariantsById = new Map(
    (localizedDefinitions.adventure_defines ?? []).map((definition) => [String(definition.id), definition]),
  )
  const patrons = normalizePatrons(
    rawDefinitions.patron_defines ?? [],
    localizedDefinitions.patron_defines ?? [],
  )
  const localizedPatronPerksById = buildIdMap(localizedDefinitions.patron_perk_defines)
  const localizedTrialsRolesById = buildIdMap(localizedDefinitions.trials_role_defines)
  const localizedTrialsDifficultiesById = buildIdMap(localizedDefinitions.trials_difficulty_defines)
  const localizedBuffsById = buildIdMap(localizedDefinitions.buff_defines)
  const localizedEffectKeysById = buildIdMap(localizedDefinitions.effect_key_defines)
  const attackDefinitionsById = buildIdMap(rawDefinitions.attack_defines)
  const localizedAttackDefinitionsById = buildIdMap(localizedDefinitions.attack_defines)
  const upgradesByHeroId = groupDefinitionsByHeroId(rawDefinitions.upgrade_defines)
  const localizedUpgradesById = buildIdMap(localizedDefinitions.upgrade_defines)
  const effectDefinitionsById = buildIdMap(rawDefinitions.effect_defines)
  const localizedEffectDefinitionsById = buildIdMap(localizedDefinitions.effect_defines)
  const featsByHeroId = groupDefinitionsByHeroId(rawDefinitions.hero_feat_defines)
  const localizedFeatsById = buildIdMap(localizedDefinitions.hero_feat_defines)
  const skinsByHeroId = groupDefinitionsByHeroId(rawDefinitions.hero_skin_defines)
  const localizedSkinsById = buildIdMap(localizedDefinitions.hero_skin_defines)
  const lootByHeroId = groupDefinitionsByHeroId(rawDefinitions.loot_defines)
  const localizedLootById = buildIdMap(localizedDefinitions.loot_defines)
  const legendaryEffectDefinitionsById = buildIdMap(rawDefinitions.legendary_effect_defines)
  const localizedLegendaryEffectDefinitionsById = buildIdMap(localizedDefinitions.legendary_effect_defines)
  const monsterCatalog = buildMonsterCatalog(rawDefinitions, attackDefinitionsById)
  const variantMetadataById = buildVariantMetadataMap(
    rawDefinitions.adventure_defines ?? [],
    localizedDefinitions.adventure_defines ?? [],
    campaignMap,
    monsterCatalog,
  )
  const graphicMap = buildGraphicMap(rawDefinitions.graphic_defines)
  const portraitSourcesByChampionId = new Map(
    collectChampionPortraitSources(rawDefinitions, masterApiUrl).map((source) => [source.championId, source]),
  )
  const playableChampionDefinitions = (rawDefinitions.hero_defines ?? []).filter((definition) =>
    isPlayableChampion(definition),
  )
  const patronEligibilityByChampionId = new Map(
    playableChampionDefinitions.map((definition) => [
      String(definition.id),
      buildChampionPatronEligibility(definition, patrons, updatedAt),
    ]),
  )
  const gameRules = (rawDefinitions.game_rule_defines ?? [])
    .map((definition) => normalizeOfficialGameRuleDefinition(definition))
    .filter(Boolean)
    .sort((left, right) => Number(left.id) - Number(right.id))
  const effectReference = {
    stats: (rawDefinitions.stat_defines ?? [])
      .map((definition) => normalizeOfficialStatDefinition(definition))
      .filter(Boolean)
      .sort((left, right) => Number(left.id) - Number(right.id)),
    buffs: (rawDefinitions.buff_defines ?? [])
      .map((definition) =>
        normalizeOfficialBuffDefinition(
          definition,
          localizedBuffsById.get(String(definition.id)) ?? definition,
        ),
      )
      .filter(Boolean)
      .sort((left, right) => Number(left.id) - Number(right.id)),
    effectKeys: (rawDefinitions.effect_key_defines ?? [])
      .map((definition) =>
        normalizeOfficialEffectKeyDefinition(
          definition,
          localizedEffectKeysById.get(String(definition.id)) ?? definition,
        ),
      )
      .filter(Boolean)
      .sort((left, right) => Number(left.id) - Number(right.id)),
  }
  const patronPerkTiers = (rawDefinitions.patron_perk_tier_defines ?? [])
    .map((definition) => normalizePatronPerkTierDefinition(definition))
    .filter(Boolean)
    .sort(
      (left, right) =>
        Number(left.patronId) - Number(right.patronId) ||
        Number(left.tierId) - Number(right.tierId) ||
        Number(left.id) - Number(right.id),
    )
  const patronPerks = (rawDefinitions.patron_perk_defines ?? [])
    .map((definition) =>
      normalizePatronPerkDefinition(
        definition,
        localizedPatronPerksById.get(String(definition.id)) ?? definition,
      ),
    )
    .filter(Boolean)
    .sort(
      (left, right) =>
        Number(left.patronId) - Number(right.patronId) ||
        Number(left.tierId) - Number(right.tierId) ||
        Number(left.id) - Number(right.id),
    )
  const trialsRoles = (rawDefinitions.trials_role_defines ?? [])
    .map((definition) =>
      normalizeTrialsRoleDefinition(
        definition,
        localizedTrialsRolesById.get(String(definition.id)) ?? definition,
        adventureMap.get(String(definition.adventure_id ?? '')) ?? null,
      ),
    )
    .filter(Boolean)
    .sort((left, right) => Number(left.id) - Number(right.id))
  const trialsDifficulties = (rawDefinitions.trials_difficulty_defines ?? [])
    .map((definition) =>
      normalizeTrialsDifficultyDefinition(
        definition,
        localizedTrialsDifficultiesById.get(String(definition.id)) ?? definition,
      ),
    )
    .filter(Boolean)
    .sort((left, right) => Number(left.id) - Number(right.id))

  const champions = playableChampionDefinitions
    .map((definition) =>
      normalizeChampion(
        definition,
        localizedChampionsById.get(String(definition.id)),
        affiliationMap,
        currentVersion,
        portraitSourcesByChampionId.get(String(definition.id)) ?? null,
        patronEligibilityByChampionId.get(String(definition.id)),
        manualOverrides.championOverrides?.[String(definition.id)] ?? {},
      ),
    )
    .sort(
      (left, right) =>
        left.seat - right.seat ||
        left.name.display.localeCompare(right.name.display) ||
        Number(left.id) - Number(right.id),
    )
  const championDefinitionsById = new Map(
    playableChampionDefinitions.map((definition) => [String(definition.id), definition]),
  )
  const championDetails = champions.map((champion) =>
    normalizeChampionDetail(
      champion,
      championDefinitionsById.get(champion.id),
      localizedChampionsById.get(champion.id),
      updatedAt,
      attackDefinitionsById,
      localizedAttackDefinitionsById,
      upgradesByHeroId,
      localizedUpgradesById,
      effectDefinitionsById,
      localizedEffectDefinitionsById,
      featsByHeroId,
      localizedFeatsById,
      skinsByHeroId,
      localizedSkinsById,
      lootByHeroId,
      localizedLootById,
      legendaryEffectDefinitionsById,
      localizedLegendaryEffectDefinitionsById,
      ),
    )

  const adventures = (rawDefinitions.adventure_defines ?? [])
    .filter((definition) => !looksLikeVariant(definition))
    .map((definition) => {
      const normalizedAdventure = adventureMap.get(String(definition.id))
      const sceneKey =
        normalizedAdventure?.locationId
          ? `${normalizedAdventure.campaign.id}:${normalizedAdventure.locationId}`
          : null

      return normalizeAdventure(
        definition,
        localizedVariantsById.get(String(definition.id)),
        normalizedAdventure,
        sceneKey ? sceneMap.get(sceneKey) ?? null : null,
      )
    })
    .sort((left, right) => Number(left.id) - Number(right.id))

  const autoVariants = (rawDefinitions.adventure_defines ?? [])
    .filter((definition) => looksLikeVariant(definition))
    .map((definition) =>
      normalizeVariant(
        definition,
        localizedVariantsById.get(String(definition.id)),
        campaignMap,
        variantMetadataById,
      ),
    )

  const variants = mergeVariants(autoVariants, manualOverrides.variants ?? [])
  const officialFormations = extractOfficialFormations(rawDefinitions, localizedDefinitions)
  const formations = mergeFormations(
    officialFormations,
    normalizeManualFormations(manualOverrides.formations ?? []),
  )
  const enums = normalizeEnums(champions, affiliationMap, campaignMap, patrons, adventures, variants)
  const championVisuals = playableChampionDefinitions
    .map((definition) => {
      const championId = String(definition.id)
      const skins = (skinsByHeroId.get(championId) ?? [])
        .map((skinDefinition) =>
          normalizeChampionVisualSkin(
            skinDefinition,
            localizedSkinsById.get(String(skinDefinition.id)),
            graphicMap,
            masterApiUrl,
          ),
        )
        .sort(
          (left, right) =>
            left.name.display.localeCompare(right.name.display) ||
            left.name.original.localeCompare(right.name.original) ||
            Number(left.id) - Number(right.id),
        )

      return normalizeChampionVisual(
        definition,
        localizedChampionsById.get(championId),
        portraitSourcesByChampionId.get(championId) ?? null,
        skins,
        graphicMap,
        currentVersion,
        masterApiUrl,
      )
    })
    .sort(
      (left, right) =>
        left.seat - right.seat ||
        left.name.display.localeCompare(right.name.display) ||
        Number(left.championId) - Number(right.championId),
    )

  await writeJson(path.join(outputDir, 'champions.json'), {
    items: champions,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'champion-visuals.json'), {
    items: championVisuals,
    updatedAt,
  })
  const championDetailsDir = path.join(outputDir, 'champion-details')
  await mkdir(championDetailsDir, { recursive: true })
  for (const detail of championDetails) {
    await writeJson(path.join(championDetailsDir, `${detail.summary.id}.json`), detail)
  }
  await writeJson(path.join(outputDir, 'variants.json'), {
    items: variants,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'adventures.json'), {
    items: adventures,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'patrons.json'), {
    items: patrons,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'game-rules.json'), {
    items: gameRules,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'effect-reference.json'), {
    stats: effectReference.stats,
    buffs: effectReference.buffs,
    effectKeys: effectReference.effectKeys,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'patron-perks.json'), {
    tiers: patronPerkTiers,
    perks: patronPerks,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'trials.json'), {
    roles: trialsRoles,
    difficulties: trialsDifficulties,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'formations.json'), {
    items: formations,
    updatedAt,
  })
  await writeJson(path.join(outputDir, 'enums.json'), {
    items: enums,
    updatedAt,
  })
  await writeJson(versionFile, {
    current: currentVersion,
    updatedAt,
    notes: [
      '公共数据来源：Idle Champions 官方客户端 definitions 接口。',
      '名称展示层同时保留官方原文与 language_id=7 返回的中文展示名。',
      '英雄头像资源来自官方 mobile_assets，并按数据版本写入 public/data/<version>/champion-portraits/。',
      '共享英雄数据现已补充 patron 基线资格，场景数据现已补充 adventures / patrons / rule context / mode tags。',
      '共享效果参考层现已补充 effect-reference.json，统一承接官方 stat / buff / effect-key 字典。',
      '共享规则层现已补充 game-rules.json、patron-perks.json、trials.json，承接官方稳定规则、Patron Perk 与 Trials 基座事实。',
      '英雄详情页数据按 public/data/<version>/champion-details/<hero-id>.json 输出，包含结构化字段与原始快照片段。',
      '英雄本体立绘与皮肤资源的官方定位元数据见 public/data/<version>/champion-visuals.json；立绘页直接消费的本地静态资源见 public/data/<version>/champion-illustrations.json。',
      '宠物页签数据来自 familiar_defines / premium_item_defines / patron_shop_item_defines，并输出到 public/data/<version>/pets.json 与 public/data/<version>/pets/。',
      '阵型布局已从官方 definitions 的 campaign / adventure game_changes 自动提取；手工补充层只用于必要覆写。',
    ],
  })

  return {
    outputDir,
    versionFile,
    updatedAt,
    counts: {
      champions: champions.length,
      championVisuals: championVisuals.length,
      championDetails: championDetails.length,
      adventures: adventures.length,
      patrons: patrons.length,
      variants: variants.length,
      formations: formations.length,
      enums: enums.length,
    },
  }
}

function printUsage() {
  console.log(`用法：
  node scripts/normalize-idle-champions-definitions.mjs --input <raw-json>

可选参数：
  --input <file>             官方原文 definitions 快照 JSON
  --localizedInput <file>    中文 definitions 快照 JSON；缺省时回退到 --input
  --outputDir <dir>          归一化集合输出目录，默认 ${DEFAULT_OUTPUT_DIR}
  --versionFile <file>       version.json 输出位置，默认 ${DEFAULT_VERSION_FILE}
  --currentVersion <name>    version.json 中的 current 字段，默认 ${DEFAULT_CURRENT_VERSION}
  --manualOverrides <file>   手工补充层 JSON，默认 ${DEFAULT_MANUAL_OVERRIDES}
  --masterApiUrl <url>       远端 mobile_assets 基础地址，默认 ${DEFAULT_MASTER_API_URL}
  --help                     显示帮助
`)
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string' },
      localizedInput: { type: 'string' },
      outputDir: { type: 'string' },
      versionFile: { type: 'string' },
      currentVersion: { type: 'string' },
      manualOverrides: { type: 'string' },
      masterApiUrl: { type: 'string' },
      help: { type: 'boolean' },
    },
  })

  if (values.help) {
    printUsage()
    return
  }

  const result = await normalizeDefinitionsSnapshot(values)

  console.log(`归一化完成：`)
  console.log(`- 输出目录: ${result.outputDir}`)
  console.log(`- version.json: ${result.versionFile}`)
  console.log(`- updatedAt: ${result.updatedAt}`)
  console.log(
    `- counts: champions=${result.counts.champions}, championVisuals=${result.counts.championVisuals}, championDetails=${result.counts.championDetails}, adventures=${result.counts.adventures}, patrons=${result.counts.patrons}, variants=${result.counts.variants}, formations=${result.counts.formations}, enums=${result.counts.enums}`,
  )
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`归一化 definitions 失败：${error.message}`)
    process.exitCode = 1
  })
}

