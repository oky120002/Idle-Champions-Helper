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
} from './normalize-text-utils.ts'
import { buildChampionPortraitPath, resolveGraphicAssetById } from './champion-asset-helpers.ts'
import type { ChampionPortraitSource, RemoteGraphicAsset } from './champion-asset-helpers.ts'
import type { JsonValue, LocalizedText } from '../../src/domain/types/common.ts'

const ROLE_TAGS = new Set<string>([
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

type RawDefinition = Record<string, unknown>
type LocalizedDefinition = RawDefinition | null | undefined
type DefinitionMap = Map<string, RawDefinition>
type GroupedDefinitionMap = Map<string, RawDefinition[]>
type GraphicMap = Map<string, RawDefinition>

function asRawRecord(value: unknown): RawDefinition {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as RawDefinition)
    : {}
}

function asRawArray(value: unknown): RawDefinition[] {
  return Array.isArray(value) ? (value as RawDefinition[]) : []
}

function toStr(value: unknown): string {
  return String(value)
}

function getAffiliationTags(
  definition: RawDefinition,
  affiliationMap: Map<string, LocalizedText>,
): string[] {
  return uniqueStrings([
    ...toStringList(definition.affiliation_tags),
    ...toStringList(definition.tags).filter((tag) => affiliationMap.has(tag)),
  ])
}

/**
 * Champion 归一化域：从 definitions 构造 champions / champion-details / champion-visuals。
 * 从 normalize-idle-champions-definitions 拆出（自包含，仅依赖 text-utils 与 champion-asset-helpers）。
 */

export function normalizeEffectReference(rawEffect: unknown): string | null {
  const text = toText(rawEffect)
  if (!text) {
    return null
  }

  if (text.startsWith('{')) {
    const match = text.match(/"effect_string"\s*:\s*"([^"]+)"/)
    if (match) {
      return match[1] ?? null
    }
  }

  return text
}

interface RawSnapshotPair {
  original: JsonValue
  display: JsonValue
}

function buildRawSnapshotPair(originalValue: unknown, displayValue: unknown): RawSnapshotPair {
  return {
    original: normalizeJsonValue(originalValue),
    display: normalizeJsonValue(displayValue ?? originalValue ?? null),
  }
}

interface RawEntry {
  id: string
  snapshots: RawSnapshotPair
}

function buildRawEntry(id: unknown, originalValue: unknown, displayValue: unknown): RawEntry {
  return {
    id: String(id),
    snapshots: buildRawSnapshotPair(originalValue, displayValue),
  }
}

function parseEffectDefinitionId(value: unknown): string | null {
  const text = toText(value)

  if (!text) {
    return null
  }

  const match = /^effect_def,([0-9]+)$/.exec(text.trim())
  return match ? (match[1] ?? null) : null
}

export interface ChampionPatronEligibility {
  eligiblePatronIds: string[]
  ruleQualifiedPatronIds: string[]
  forcedEligiblePatronIds: string[]
  unsupportedPatronIds: string[]
}

export interface ChampionPortrait {
  path: string
  sourceGraphic: string
  sourceVersion: number | null
}

export interface NormalizedChampion {
  id: string
  name: LocalizedText
  seat: number
  roles: string[]
  affiliations: LocalizedText[]
  tags: string[]
  patronEligibility: ChampionPatronEligibility | null | undefined
  portrait: ChampionPortrait | null
}

export function normalizeChampion(
  originalDefinition: RawDefinition,
  localizedDefinition: LocalizedDefinition,
  affiliationMap: Map<string, LocalizedText>,
  currentVersion: string,
  portraitSource: ChampionPortraitSource | null,
  patronEligibility: ChampionPatronEligibility | null | undefined,
  override: Readonly<Record<string, unknown>> = {},
): NormalizedChampion {
  const originalName =
    originalDefinition.name ??
    originalDefinition.english_name ??
    asRawRecord(originalDefinition.character_sheet_details).full_name ??
    `Champion ${String(originalDefinition.id)}`
  const displayName =
    override.displayName ??
    override.name ??
    localizedDefinition?.name ??
    asRawRecord(localizedDefinition?.character_sheet_details).full_name ??
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
      .filter((value): value is LocalizedText => value !== undefined),
    ...toLocalizedOverrideList(override.affiliations),
  ]).sort(compareLocalizedText)

  return {
    id: String(originalDefinition.id),
    name: normalizeLocalizedText(
      originalName,
      displayName,
      `Champion ${String(originalDefinition.id)}`,
    )!,
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

interface CharacterSheet {
  fullName: LocalizedText | null
  class: LocalizedText | null
  race: LocalizedText | null
  age: number | null
  alignment: LocalizedText | null
  abilityScores: Record<string, number>
  backstory: LocalizedText | null
}

function normalizeChampionCharacterSheet(
  originalDefinition: RawDefinition,
  localizedDefinition: LocalizedDefinition,
): CharacterSheet | null {
  const originalSheet = asRawRecord(originalDefinition.character_sheet_details)
  const localizedSheet = asRawRecord(localizedDefinition?.character_sheet_details)
  const rawAbilityScores = originalSheet.ability_scores
  const abilityScores: Record<string, number> = Object.fromEntries(
    ['str', 'dex', 'con', 'int', 'wis', 'cha']
      .map((key) => [key, normalizeNumber(asRawRecord(rawAbilityScores)[key])])
      .filter(([, value]) => value !== null) as [string, number][],
  )

  const result: CharacterSheet = {
    fullName: normalizeOptionalLocalizedText(
      originalSheet.full_name,
      localizedSheet.full_name,
      originalDefinition.name ?? `Champion ${String(originalDefinition.id)}`,
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

interface NormalizedAttack {
  id: string
  name: LocalizedText
  description: LocalizedText | null
  longDescription: LocalizedText | null
  cooldown: number | null
  numTargets: number | null
  aoeRadius: number | null
  damageModifier: string | null
  target: string | null
  damageTypes: string[]
  tags: string[]
  graphicId: string | null
  animations: JsonValue
}

function normalizeAttack(
  originalDefinition: RawDefinition | null | undefined,
  localizedDefinition: LocalizedDefinition,
): NormalizedAttack | null {
  if (!originalDefinition) {
    return null
  }

  return {
    id: String(originalDefinition.id),
    name: normalizeLocalizedText(
      originalDefinition.name,
      localizedDefinition?.name,
      `Attack ${String(originalDefinition.id)}`,
    )!,
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

interface EventUpgrade {
  upgradeId: string
  name: LocalizedText
  description: LocalizedText | null
  graphicId: string | null
}

function normalizeEventUpgrades(
  originalItems: readonly RawDefinition[] = [],
  localizedItems: readonly RawDefinition[] = [],
): EventUpgrade[] {
  const localizedByUpgradeId = new Map(
    localizedItems.map((item) => [toStr(item.upgrade_id ?? item.id ?? ''), item]),
  )

  return originalItems
    .map((item) => {
      const localizedItem = localizedByUpgradeId.get(toStr(item.upgrade_id ?? item.id ?? '')) ?? {}

      return {
        upgradeId: toStr(item.upgrade_id ?? item.id ?? ''),
        name: normalizeLocalizedText(
          item.name,
          localizedItem.name,
          `Event Upgrade ${toStr(item.upgrade_id ?? item.id ?? '')}`,
        )!,
        description: normalizeOptionalLocalizedText(item.description, localizedItem.description),
        graphicId: toText(item.graphic_id),
      }
    })
    .sort((left, right) => Number(left.upgradeId) - Number(right.upgradeId))
}

interface ChampionUpgrade {
  id: string
  requiredLevel: number | null
  requiredUpgradeId: string | null
  name: LocalizedText | null
  upgradeType: string | null
  effectReference: string | null
  effectDefinition: RawEntry | null
  staticDpsMult: string | null
  defaultEnabled: boolean
  specializationName: LocalizedText | null
  specializationDescription: LocalizedText | null
  specializationGraphicId: string | null
  tipText: LocalizedText | null
}

function normalizeChampionUpgrade(
  originalDefinition: RawDefinition,
  localizedDefinition: LocalizedDefinition,
  effectDefinitionsById: DefinitionMap,
  localizedEffectDefinitionsById: DefinitionMap,
): ChampionUpgrade {
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

interface ChampionFeat {
  id: string
  order: number | null
  name: LocalizedText
  description: LocalizedText | null
  rarity: string | null
  graphicId: string | null
  effects: JsonValue
  sources: JsonValue
  properties: JsonValue
  collectionsSource: JsonValue
}

function normalizeChampionFeat(
  originalDefinition: RawDefinition,
  localizedDefinition: LocalizedDefinition,
): ChampionFeat {
  return {
    id: String(originalDefinition.id),
    order: normalizeNumber(originalDefinition.order),
    name: normalizeLocalizedText(
      originalDefinition.name,
      localizedDefinition?.name,
      `Feat ${String(originalDefinition.id)}`,
    )!,
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

interface ChampionSkin {
  id: string
  name: LocalizedText
  cost: JsonValue
  details: JsonValue
  rarity: string | null
  properties: JsonValue
  collectionsSource: JsonValue
  availabilities: JsonValue
}

function normalizeChampionSkin(
  originalDefinition: RawDefinition,
  localizedDefinition: LocalizedDefinition,
): ChampionSkin {
  return {
    id: String(originalDefinition.id),
    name: normalizeLocalizedText(
      originalDefinition.name,
      localizedDefinition?.name,
      `Skin ${String(originalDefinition.id)}`,
    )!,
    cost: normalizeJsonValue(originalDefinition.cost ?? []),
    details: normalizeJsonValue(originalDefinition.details ?? {}),
    rarity: toText(originalDefinition.rarity),
    properties: normalizeJsonValue(originalDefinition.properties ?? {}),
    collectionsSource: normalizeJsonValue(originalDefinition.collections_source ?? {}),
    availabilities: normalizeJsonValue(originalDefinition.availabilities ?? null),
  }
}

interface ChampionLoot {
  id: string
  name: LocalizedText
  description: LocalizedText | null
  graphicId: string | null
  slotId: number | null
  rarity: string | null
  maxLevel: number[]
  effects: JsonValue
  allowGoldenEpic: boolean
  isGoldenEpic: boolean
}

function normalizeChampionLoot(
  originalDefinition: RawDefinition,
  localizedDefinition: LocalizedDefinition,
  goldenEpicLootId: string | null,
): ChampionLoot {
  const id = String(originalDefinition.id)

  return {
    id,
    name: normalizeLocalizedText(
      originalDefinition.name,
      localizedDefinition?.name,
      `Loot ${String(originalDefinition.id)}`,
    )!,
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

interface LegendaryEffect {
  id: string
  slotId: number
  effects: JsonValue
}

function normalizeChampionLegendaryEffects(
  originalDefinition: RawDefinition,
  legendaryEffectDefinitionsById: DefinitionMap,
): LegendaryEffect[] {
  return uniqueStrings(
    toStringList(asRawRecord(originalDefinition.properties).legendary_effect_id),
  )
    .map((effectId, index) => {
      const effectDefinition = legendaryEffectDefinitionsById.get(effectId)

      return {
        id: effectId,
        slotId: index + 1,
        effects: normalizeJsonValue(asRawRecord(effectDefinition).effects ?? []),
      }
    })
}

export interface ChampionVisualSkin {
  id: string
  name: LocalizedText
  portrait: RemoteGraphicAsset | null
  base: RemoteGraphicAsset | null
  large: RemoteGraphicAsset | null
  xl: RemoteGraphicAsset | null
}

export function normalizeChampionVisualSkin(
  originalDefinition: RawDefinition,
  localizedDefinition: LocalizedDefinition,
  graphicMap: GraphicMap,
  baseUrl: string,
): ChampionVisualSkin {
  const originalName =
    originalDefinition.name ?? originalDefinition.skin_name ?? `Skin ${String(originalDefinition.id)}`
  const displayName = localizedDefinition?.name ?? localizedDefinition?.skin_name ?? originalName
  const details = asRawRecord(originalDefinition.details)

  return {
    id: String(originalDefinition.id),
    name: normalizeLocalizedText(originalName, displayName, `Skin ${String(originalDefinition.id)}`)!,
    portrait: resolveGraphicAssetById(graphicMap, details.portrait_graphic_id, baseUrl),
    base: resolveGraphicAssetById(graphicMap, details.base_graphic_id, baseUrl),
    large: resolveGraphicAssetById(graphicMap, details.large_graphic_id, baseUrl),
    xl: resolveGraphicAssetById(graphicMap, details.xl_graphic_id, baseUrl),
  }
}

export interface ChampionVisual {
  championId: string
  seat: number
  name: LocalizedText
  portrait: { localPath: string; remote: RemoteGraphicAsset } | null
  base: RemoteGraphicAsset | null
  skins: readonly ChampionVisualSkin[]
}

export function normalizeChampionVisual(
  originalDefinition: RawDefinition,
  localizedDefinition: LocalizedDefinition,
  portraitSource: ChampionPortraitSource | null,
  skins: readonly ChampionVisualSkin[],
  graphicMap: GraphicMap,
  currentVersion: string,
  baseUrl: string,
): ChampionVisual {
  const originalName =
    originalDefinition.name ??
    originalDefinition.english_name ??
    asRawRecord(originalDefinition.character_sheet_details).full_name ??
    `Champion ${String(originalDefinition.id)}`
  const displayName =
    localizedDefinition?.name ??
    asRawRecord(localizedDefinition?.character_sheet_details).full_name ??
    originalName

  return {
    championId: String(originalDefinition.id),
    seat: Number(originalDefinition.seat_id ?? originalDefinition.seat ?? 0),
    name: normalizeLocalizedText(
      originalName,
      displayName,
      `Champion ${String(originalDefinition.id)}`,
    )!,
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

/**
 * 英雄 ult/主动技能（ability_defines，id===hero_id 对齐）。
 * effect 三形态：裸 string、JSON 串（'{"effect_string":"..."}'）、effect_def,N 引用（展开 effect_defines[N].effect_keys）。
 */
export interface ChampionAbility {
  id: string
  duration: number
  baseCooldown: number
  /** uptime 折算后的 effect_string 列表（value × min(1, duration/baseCooldown)，effect_def 引用已展开）。 */
  effects: string[]
}

/** 解析 ability.effect（三形态）→ 标准 effect_string 列表（effect_def 引用已展开）。 */
function expandAbilityEffectStrings(
  effect: unknown,
  effectDefinitionsById: DefinitionMap,
): string[] {
  if (typeof effect !== 'string' || effect === '') return []
  // 形态 1：effect_def,N 引用 → 展开 effect_defines[N].effect_keys（顶层，raw effect_defines 结构）。
  const defMatch = /^effect_def,(.+)$/.exec(effect)
  if (defMatch) {
    const def = effectDefinitionsById.get(defMatch[1]!)
    return asRawArray(asRawRecord(def).effect_keys)
      .map((key) => asRawRecord(key))
      .map((key) => (typeof key.effect_string === 'string' ? key.effect_string : ''))
      .filter((s) => s !== '')
  }
  // 形态 2：JSON 串 → parse 取 effect_string
  if (effect.startsWith('{')) {
    try {
      const parsed = JSON.parse(effect) as { effect_string?: unknown }
      return typeof parsed.effect_string === 'string' && parsed.effect_string !== ''
        ? [parsed.effect_string]
        : []
    } catch {
      return []
    }
  }
  // 形态 3：裸 string
  return [effect]
}

/** effect_string 的 value 段 × uptime（modron 满级 steady-state 折算）。 */
function foldEffectValueByUptime(effectString: string, uptime: number): string {
  if (uptime >= 1) return effectString
  const parts = effectString.split(',')
  if (parts.length < 2) return effectString
  const value = Number(parts[1])
  if (!Number.isFinite(value)) return effectString
  parts[1] = String(value * uptime)
  return parts.join(',')
}

/**
 * 提取 ability_defines → champion-details.ability。
 * uptime = duration/baseCooldown（modron 满级自动施放 steady-state）；value × uptime 预折算进 effect_string，
 * 消费层（collectRawEffectEntries 'ability' 源）直接收折算后串进 pool（global_dps/hero_dps/attack_speed/buff_upgrades）。
 * 无 modron 降级留消费层。
 */
export function normalizeChampionAbility(
  abilityDefine: RawDefinition | undefined,
  effectDefinitionsById: DefinitionMap,
): ChampionAbility | null {
  if (!abilityDefine) return null
  const duration = normalizeNumber(abilityDefine.duration) ?? 0
  const baseCooldown = normalizeNumber(abilityDefine.base_cooldown) ?? 0
  const uptime = duration > 0 && baseCooldown > 0 ? Math.min(1, duration / baseCooldown) : 0
  const effects = expandAbilityEffectStrings(abilityDefine.effect, effectDefinitionsById).map(
    (effectString) => foldEffectValueByUptime(effectString, uptime),
  )
  return { id: toText(abilityDefine.id) ?? '', duration, baseCooldown, effects }
}

export interface ChampionDetail {
  updatedAt: unknown
  summary: NormalizedChampion
  englishName: string
  eventName: LocalizedText | null
  dateAvailable: string | null
  lastReworkDate: string | null
  popularity: number | null
  baseCost: string | null
  baseDamage: string | null
  baseHealth: string | null
  graphicId: string | null
  portraitGraphicId: string | null
  availability: {
    availableInNextEvent: boolean
    availableInShop: boolean
    availableInTimeGate: boolean
    isAvailable: boolean
    nextEventTimestamp: number | null
  }
  adventureIds: string[]
  defaultFeatSlotUnlocks: number[]
  costCurves: JsonValue
  healthCurves: JsonValue
  properties: JsonValue
  characterSheet: CharacterSheet | null
  attacks: {
    base: NormalizedAttack | null
    ultimate: NormalizedAttack | null
    eventUpgrades: EventUpgrade[]
  }
  upgrades: ChampionUpgrade[]
  feats: ChampionFeat[]
  skins: ChampionSkin[]
  loot: ChampionLoot[]
  legendaryEffects: LegendaryEffect[]
  /** 英雄 ult/主动技能（ability_defines，id===hero_id 对齐）。 */
  ability: ChampionAbility | null
  raw: {
    hero: RawSnapshotPair
    attacks: RawEntry[]
    upgrades: RawEntry[]
    feats: RawEntry[]
    skins: RawEntry[]
    loot: RawEntry[]
    legendaryEffects: RawEntry[]
  }
}

export function normalizeChampionDetail(
  champion: NormalizedChampion,
  originalDefinition: RawDefinition,
  localizedDefinition: LocalizedDefinition,
  updatedAt: unknown,
  attackDefinitionsById: DefinitionMap,
  localizedAttackDefinitionsById: DefinitionMap,
  upgradesByHeroId: GroupedDefinitionMap,
  localizedUpgradesById: DefinitionMap,
  effectDefinitionsById: DefinitionMap,
  localizedEffectDefinitionsById: DefinitionMap,
  featsByHeroId: GroupedDefinitionMap,
  localizedFeatsById: DefinitionMap,
  skinsByHeroId: GroupedDefinitionMap,
  localizedSkinsById: DefinitionMap,
  lootByHeroId: GroupedDefinitionMap,
  localizedLootById: DefinitionMap,
  legendaryEffectDefinitionsById: DefinitionMap,
  localizedLegendaryEffectDefinitionsById: DefinitionMap,
  abilityDefine: RawDefinition | undefined,
): ChampionDetail {
  const baseAttackId = toText(originalDefinition.base_attack_id)
  const ultimateAttackId = toText(originalDefinition.ultimate_attack_id)
  const goldenEpicLootId = toText(asRawRecord(originalDefinition.properties).golden_epic_loot_id)
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
      normalizeChampionLoot(
        definition,
        localizedLootById.get(String(definition.id)),
        goldenEpicLootId,
      ),
    )
    .sort(
      (left, right) =>
        (left.slotId ?? Number.MAX_SAFE_INTEGER) - (right.slotId ?? Number.MAX_SAFE_INTEGER) ||
        Number(left.rarity ?? Number.MAX_SAFE_INTEGER) - Number(right.rarity ?? Number.MAX_SAFE_INTEGER) ||
        Number(left.id) - Number(right.id),
    )
  const legendaryEffects = normalizeChampionLegendaryEffects(
    originalDefinition,
    legendaryEffectDefinitionsById,
  )
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
        asRawArray(originalDefinition.event_upgrades),
        asRawArray(localizedDefinition?.event_upgrades),
      ),
    },
    upgrades,
    feats,
    skins,
    loot,
    legendaryEffects,
    ability: normalizeChampionAbility(abilityDefine, effectDefinitionsById),
    raw: {
      hero: buildRawSnapshotPair(originalDefinition, localizedDefinition ?? null),
      attacks: [baseAttackId, ultimateAttackId]
        .filter((value): value is string => value !== null)
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
