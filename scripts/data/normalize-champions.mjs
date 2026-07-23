import {
  compareLocalizedText,
  normalizeJsonValue,
  normalizeLocalizedText,
  normalizeNumber,
  normalizeNumberList,
  normalizeOptionalLocalizedText,
  toLocalizedOverrideList,
  toStringList,
  toText,
  uniqueLocalizedTexts,
  uniqueStrings,
} from './normalize-text-utils.mjs'
import { buildChampionPortraitPath, resolveGraphicAssetById } from './champion-asset-helpers.mjs'

const ROLE_TAGS = new Set([
  'breaking',
  'control',
  'debuff',
  'dps',
  'gold',
  'healing',
  'speed',
  'support',
  'tank',
  'tanking',
])

function getAffiliationTags(definition, affiliationMap) {
  return uniqueStrings([
    ...toStringList(definition.affiliation_tags),
    ...toStringList(definition.tags).filter((tag) => affiliationMap.has(tag)),
  ])
}

/**
 * Champion 归一化域：从 definitions 构造 champions / champion-details / champion-visuals。
 * 从 normalize-idle-champions-definitions 拆出（自包含，仅依赖 text-utils 与 champion-asset-helpers）。
 */

export function normalizeEffectReference(rawEffect) {
  const text = toText(rawEffect)
  if (!text) {
    return null
  }

  if (text.startsWith('{')) {
    const match = text.match(/"effect_string"\s*:\s*"([^"]+)"/)
    if (match) {
      return match[1]
    }
  }

  return text
}

function buildRawSnapshotPair(originalValue, displayValue) {
  return {
    original: normalizeJsonValue(originalValue),
    display: normalizeJsonValue(displayValue ?? originalValue ?? null),
  }
}

function buildRawEntry(id, originalValue, displayValue) {
  return {
    id: String(id),
    snapshots: buildRawSnapshotPair(originalValue, displayValue),
  }
}

function parseEffectDefinitionId(value) {
  const text = toText(value)

  if (!text) {
    return null
  }

  const match = /^effect_def,([0-9]+)$/.exec(text.trim())
  return match ? match[1] : null
}

export function normalizeChampion(
  originalDefinition,
  localizedDefinition,
  affiliationMap,
  currentVersion,
  portraitSource,
  patronEligibility,
  override = {},
) {
  const originalName =
    originalDefinition.name ??
    originalDefinition.english_name ??
    originalDefinition.character_sheet_details?.full_name ??
    `Champion ${originalDefinition.id}`
  const displayName =
    override.displayName ??
    override.name ??
    localizedDefinition?.name ??
    localizedDefinition?.character_sheet_details?.full_name ??
    originalName
  const tags = uniqueStrings([
    ...toStringList(originalDefinition.tags),
    ...toStringList(override.tags),
  ]).sort((left, right) => left.localeCompare(right))

  const roles = uniqueStrings([
    ...tags.filter((tag) => ROLE_TAGS.has(tag)),
    ...toStringList(override.roles),
  ]).sort((left, right) => left.localeCompare(right))

  const affiliations = uniqueLocalizedTexts([
    ...getAffiliationTags(originalDefinition, affiliationMap)
      .map((tag) => affiliationMap.get(tag))
      .filter(Boolean),
    ...toLocalizedOverrideList(override.affiliations),
  ]).sort(compareLocalizedText)

  return {
    id: String(originalDefinition.id),
    name: normalizeLocalizedText(originalName, displayName, `Champion ${originalDefinition.id}`),
    seat: Number(originalDefinition.seat_id ?? originalDefinition.seat ?? 0),
    roles,
    affiliations,
    tags,
    patronEligibility,
    portrait: portraitSource
      ? {
          path: buildChampionPortraitPath(currentVersion, String(originalDefinition.id)),
          sourceGraphic: portraitSource.graphic,
          sourceVersion: portraitSource.version,
        }
      : null,
  }
}

function normalizeChampionCharacterSheet(originalDefinition, localizedDefinition) {
  const originalSheet = originalDefinition.character_sheet_details ?? {}
  const localizedSheet = localizedDefinition?.character_sheet_details ?? {}
  const abilityScores = Object.fromEntries(
    ['str', 'dex', 'con', 'int', 'wis', 'cha']
      .map((key) => [key, normalizeNumber(originalSheet.ability_scores?.[key])])
      .filter(([, value]) => value !== null),
  )

  const result = {
    fullName: normalizeOptionalLocalizedText(
      originalSheet.full_name,
      localizedSheet.full_name,
      originalDefinition.name ?? `Champion ${originalDefinition.id}`,
    ),
    class: normalizeOptionalLocalizedText(originalSheet.class, localizedSheet.class),
    race: normalizeOptionalLocalizedText(originalSheet.race, localizedSheet.race),
    age: normalizeNumber(originalSheet.age),
    alignment: normalizeOptionalLocalizedText(originalSheet.alignment, localizedSheet.alignment),
    abilityScores,
    backstory: normalizeOptionalLocalizedText(originalSheet.backstory, localizedSheet.backstory),
  }

  return result.fullName ||
    result.class ||
    result.race ||
    result.age !== null ||
    result.alignment ||
    result.backstory ||
    Object.keys(result.abilityScores).length > 0
    ? result
    : null
}

function normalizeAttack(originalDefinition, localizedDefinition) {
  if (!originalDefinition) {
    return null
  }

  return {
    id: String(originalDefinition.id),
    name: normalizeLocalizedText(
      originalDefinition.name,
      localizedDefinition?.name,
      `Attack ${originalDefinition.id}`,
    ),
    description: normalizeOptionalLocalizedText(
      originalDefinition.description,
      localizedDefinition?.description,
    ),
    longDescription: normalizeOptionalLocalizedText(
      originalDefinition.long_description,
      localizedDefinition?.long_description,
    ),
    cooldown: normalizeNumber(originalDefinition.cooldown),
    numTargets: normalizeNumber(originalDefinition.num_targets),
    aoeRadius: normalizeNumber(originalDefinition.aoe_radius),
    damageModifier: toText(originalDefinition.damage_modifier),
    target: toText(originalDefinition.target),
    damageTypes: uniqueStrings(toStringList(originalDefinition.damage_types)),
    tags: uniqueStrings(toStringList(originalDefinition.tags)),
    graphicId: toText(originalDefinition.graphic_id),
    animations: normalizeJsonValue(originalDefinition.animations ?? []),
  }
}

function normalizeEventUpgrades(originalItems = [], localizedItems = []) {
  const localizedByUpgradeId = new Map(
    localizedItems.map((item) => [String(item.upgrade_id ?? item.id ?? ''), item]),
  )

  return originalItems
    .map((item) => {
      const localizedItem = localizedByUpgradeId.get(String(item.upgrade_id ?? item.id ?? '')) ?? {}

      return {
        upgradeId: String(item.upgrade_id ?? item.id ?? ''),
        name: normalizeLocalizedText(
          item.name,
          localizedItem.name,
          `Event Upgrade ${item.upgrade_id ?? item.id ?? ''}`,
        ),
        description: normalizeOptionalLocalizedText(item.description, localizedItem.description),
        graphicId: toText(item.graphic_id),
      }
    })
    .sort((left, right) => Number(left.upgradeId) - Number(right.upgradeId))
}

function normalizeChampionUpgrade(
  originalDefinition,
  localizedDefinition,
  effectDefinitionsById,
  localizedEffectDefinitionsById,
) {
  const effectReference = normalizeEffectReference(originalDefinition.effect)
  const effectDefinitionId = parseEffectDefinitionId(effectReference)

  return {
    id: String(originalDefinition.id),
    requiredLevel: normalizeNumber(originalDefinition.required_level),
    requiredUpgradeId: (() => {
      const value = toText(originalDefinition.required_upgrade_id)
      return value && value !== '0' ? value : null
    })(),
    name: normalizeOptionalLocalizedText(originalDefinition.name, localizedDefinition?.name),
    upgradeType: toText(originalDefinition.upgrade_type),
    effectReference,
    effectDefinition: effectDefinitionId
      ? buildRawEntry(
          effectDefinitionId,
          effectDefinitionsById.get(effectDefinitionId) ?? null,
          localizedEffectDefinitionsById.get(effectDefinitionId) ?? null,
        )
      : null,
    staticDpsMult: toText(originalDefinition.static_dps_mult),
    defaultEnabled: Boolean(originalDefinition.default_enabled),
    specializationName: normalizeOptionalLocalizedText(
      originalDefinition.specialization_name,
      localizedDefinition?.specialization_name,
    ),
    specializationDescription: normalizeOptionalLocalizedText(
      originalDefinition.specialization_description,
      localizedDefinition?.specialization_description,
    ),
    specializationGraphicId: toText(originalDefinition.specialization_graphic_id),
    tipText: normalizeOptionalLocalizedText(originalDefinition.tip_text, localizedDefinition?.tip_text),
  }
}

function normalizeChampionFeat(originalDefinition, localizedDefinition) {
  return {
    id: String(originalDefinition.id),
    order: normalizeNumber(originalDefinition.order),
    name: normalizeLocalizedText(
      originalDefinition.name,
      localizedDefinition?.name,
      `Feat ${originalDefinition.id}`,
    ),
    description: normalizeOptionalLocalizedText(
      originalDefinition.description,
      localizedDefinition?.description,
    ),
    rarity: toText(originalDefinition.rarity),
    graphicId: toText(originalDefinition.graphic_id),
    effects: normalizeJsonValue(originalDefinition.effects ?? []),
    sources: normalizeJsonValue(originalDefinition.sources ?? []),
    properties: normalizeJsonValue(originalDefinition.properties ?? {}),
    collectionsSource: normalizeJsonValue(originalDefinition.collections_source ?? {}),
  }
}

function normalizeChampionSkin(originalDefinition, localizedDefinition) {
  return {
    id: String(originalDefinition.id),
    name: normalizeLocalizedText(
      originalDefinition.name,
      localizedDefinition?.name,
      `Skin ${originalDefinition.id}`,
    ),
    cost: normalizeJsonValue(originalDefinition.cost ?? []),
    details: normalizeJsonValue(originalDefinition.details ?? {}),
    rarity: toText(originalDefinition.rarity),
    properties: normalizeJsonValue(originalDefinition.properties ?? {}),
    collectionsSource: normalizeJsonValue(originalDefinition.collections_source ?? {}),
    availabilities: normalizeJsonValue(originalDefinition.availabilities ?? null),
  }
}

function normalizeChampionLoot(originalDefinition, localizedDefinition, goldenEpicLootId) {
  const id = String(originalDefinition.id)

  return {
    id,
    name: normalizeLocalizedText(
      originalDefinition.name,
      localizedDefinition?.name,
      `Loot ${originalDefinition.id}`,
    ),
    description: normalizeOptionalLocalizedText(
      originalDefinition.description,
      localizedDefinition?.description,
    ),
    graphicId: toText(originalDefinition.graphic_id),
    slotId: normalizeNumber(originalDefinition.slot_id),
    rarity: toText(originalDefinition.rarity),
    maxLevel: normalizeNumberList(originalDefinition.max_level),
    effects: normalizeJsonValue(originalDefinition.effects ?? []),
    allowGoldenEpic: Boolean(originalDefinition.allow_ge),
    isGoldenEpic: Boolean(goldenEpicLootId && id === goldenEpicLootId),
  }
}

function normalizeChampionLegendaryEffects(originalDefinition, legendaryEffectDefinitionsById) {
  return uniqueStrings(toStringList(originalDefinition.properties?.legendary_effect_id))
    .map((effectId, index) => {
      const effectDefinition = legendaryEffectDefinitionsById.get(effectId)

      return {
        id: effectId,
        slotId: index + 1,
        effects: normalizeJsonValue(effectDefinition?.effects ?? []),
      }
    })
}

export function normalizeChampionVisualSkin(originalDefinition, localizedDefinition, graphicMap, baseUrl) {
  const originalName = originalDefinition.name ?? originalDefinition.skin_name ?? `Skin ${originalDefinition.id}`
  const displayName = localizedDefinition?.name ?? localizedDefinition?.skin_name ?? originalName

  return {
    id: String(originalDefinition.id),
    name: normalizeLocalizedText(originalName, displayName, `Skin ${originalDefinition.id}`),
    portrait: resolveGraphicAssetById(graphicMap, originalDefinition.details?.portrait_graphic_id, baseUrl),
    base: resolveGraphicAssetById(graphicMap, originalDefinition.details?.base_graphic_id, baseUrl),
    large: resolveGraphicAssetById(graphicMap, originalDefinition.details?.large_graphic_id, baseUrl),
    xl: resolveGraphicAssetById(graphicMap, originalDefinition.details?.xl_graphic_id, baseUrl),
  }
}

export function normalizeChampionVisual(
  originalDefinition,
  localizedDefinition,
  portraitSource,
  skins,
  graphicMap,
  currentVersion,
  baseUrl,
) {
  const originalName =
    originalDefinition.name ??
    originalDefinition.english_name ??
    originalDefinition.character_sheet_details?.full_name ??
    `Champion ${originalDefinition.id}`
  const displayName =
    localizedDefinition?.name ??
    localizedDefinition?.character_sheet_details?.full_name ??
    originalName

  return {
    championId: String(originalDefinition.id),
    seat: Number(originalDefinition.seat_id ?? originalDefinition.seat ?? 0),
    name: normalizeLocalizedText(originalName, displayName, `Champion ${originalDefinition.id}`),
    portrait: portraitSource?.remote
      ? {
          localPath: buildChampionPortraitPath(currentVersion, String(originalDefinition.id)),
          remote: portraitSource.remote,
        }
      : null,
    base: resolveGraphicAssetById(graphicMap, originalDefinition.graphic_id, baseUrl),
    skins,
  }
}

export function normalizeChampionDetail(
  champion,
  originalDefinition,
  localizedDefinition,
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
) {
  const baseAttackId = toText(originalDefinition.base_attack_id)
  const ultimateAttackId = toText(originalDefinition.ultimate_attack_id)
  const goldenEpicLootId = toText(originalDefinition.properties?.golden_epic_loot_id)
  const upgrades = (upgradesByHeroId.get(champion.id) ?? [])
    .map((definition) =>
      normalizeChampionUpgrade(
        definition,
        localizedUpgradesById.get(String(definition.id)),
        effectDefinitionsById,
        localizedEffectDefinitionsById,
      ),
    )
    .sort(
      (left, right) =>
        (left.requiredLevel ?? Number.MAX_SAFE_INTEGER) -
          (right.requiredLevel ?? Number.MAX_SAFE_INTEGER) || Number(left.id) - Number(right.id),
    )
  const feats = (featsByHeroId.get(champion.id) ?? [])
    .map((definition) =>
      normalizeChampionFeat(definition, localizedFeatsById.get(String(definition.id))),
    )
    .sort(
      (left, right) =>
        (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
        Number(left.id) - Number(right.id),
    )
  const skins = (skinsByHeroId.get(champion.id) ?? [])
    .map((definition) =>
      normalizeChampionSkin(definition, localizedSkinsById.get(String(definition.id))),
    )
    .sort((left, right) => Number(left.id) - Number(right.id))
  const loot = (lootByHeroId.get(champion.id) ?? [])
    .map((definition) =>
      normalizeChampionLoot(definition, localizedLootById.get(String(definition.id)), goldenEpicLootId),
    )
    .sort(
      (left, right) =>
        (left.slotId ?? Number.MAX_SAFE_INTEGER) - (right.slotId ?? Number.MAX_SAFE_INTEGER) ||
        Number(left.rarity ?? Number.MAX_SAFE_INTEGER) - Number(right.rarity ?? Number.MAX_SAFE_INTEGER) ||
        Number(left.id) - Number(right.id),
    )
  const legendaryEffects = normalizeChampionLegendaryEffects(originalDefinition, legendaryEffectDefinitionsById)
  const baseAttack = baseAttackId
    ? normalizeAttack(
        attackDefinitionsById.get(baseAttackId),
        localizedAttackDefinitionsById.get(baseAttackId),
      )
    : null
  const ultimateAttack = ultimateAttackId
    ? normalizeAttack(
        attackDefinitionsById.get(ultimateAttackId),
        localizedAttackDefinitionsById.get(ultimateAttackId),
      )
    : null

  return {
    updatedAt,
    summary: champion,
    englishName: toText(originalDefinition.english_name) ?? champion.name.original,
    eventName: normalizeOptionalLocalizedText(
      originalDefinition.event_name,
      localizedDefinition?.event_name,
    ),
    dateAvailable: toText(originalDefinition.date_available),
    lastReworkDate: toText(originalDefinition.last_rework_date),
    popularity: normalizeNumber(originalDefinition.popularity),
    baseCost: toText(originalDefinition.base_cost),
    baseDamage: toText(originalDefinition.base_damage),
    baseHealth: toText(originalDefinition.base_health),
    graphicId: toText(originalDefinition.graphic_id),
    portraitGraphicId: toText(originalDefinition.portrait_graphic_id),
    availability: {
      availableInNextEvent: Boolean(originalDefinition.available_in_next_event),
      availableInShop: Boolean(originalDefinition.available_in_shop),
      availableInTimeGate: Boolean(originalDefinition.available_in_time_gate),
      isAvailable: Boolean(originalDefinition.is_available),
      nextEventTimestamp: normalizeNumber(originalDefinition.next_event_timestamp),
    },
    adventureIds: uniqueStrings(toStringList(originalDefinition.adventure_ids)),
    defaultFeatSlotUnlocks: uniqueStrings(toStringList(originalDefinition.default_feat_slot_unlocks))
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right),
    costCurves: normalizeJsonValue(originalDefinition.cost_curves ?? {}),
    healthCurves: normalizeJsonValue(originalDefinition.health_curves ?? {}),
    properties: normalizeJsonValue(originalDefinition.properties ?? {}),
    characterSheet: normalizeChampionCharacterSheet(originalDefinition, localizedDefinition),
    attacks: {
      base: baseAttack,
      ultimate: ultimateAttack,
      eventUpgrades: normalizeEventUpgrades(
        originalDefinition.event_upgrades,
        localizedDefinition?.event_upgrades,
      ),
    },
    upgrades,
    feats,
    skins,
    loot,
    legendaryEffects,
    raw: {
      hero: buildRawSnapshotPair(originalDefinition, localizedDefinition ?? null),
      attacks: [baseAttackId, ultimateAttackId]
        .filter(Boolean)
        .map((attackId) =>
          buildRawEntry(
            attackId,
            attackDefinitionsById.get(attackId) ?? null,
            localizedAttackDefinitionsById.get(attackId) ?? null,
          ),
        ),
      upgrades: (upgradesByHeroId.get(champion.id) ?? []).map((definition) =>
        buildRawEntry(
          definition.id,
          definition,
          localizedUpgradesById.get(String(definition.id)) ?? null,
        ),
      ),
      feats: (featsByHeroId.get(champion.id) ?? []).map((definition) =>
        buildRawEntry(definition.id, definition, localizedFeatsById.get(String(definition.id)) ?? null),
      ),
      skins: (skinsByHeroId.get(champion.id) ?? []).map((definition) =>
        buildRawEntry(definition.id, definition, localizedSkinsById.get(String(definition.id)) ?? null),
      ),
      loot: (lootByHeroId.get(champion.id) ?? []).map((definition) =>
        buildRawEntry(definition.id, definition, localizedLootById.get(String(definition.id)) ?? null),
      ),
      legendaryEffects: legendaryEffects.map((effect) =>
        buildRawEntry(
          effect.id,
          legendaryEffectDefinitionsById.get(effect.id) ?? null,
          localizedLegendaryEffectDefinitionsById.get(effect.id) ?? null,
        ),
      ),
    },
  }
}
