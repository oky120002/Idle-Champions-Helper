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
import { looksLikeVariant } from './formation-layout-helpers.ts'
import {
  buildScenarioModeTags,
  buildScenarioRuleContextId,
  normalizePatronDefinition,
  normalizePatronObjectiveTiers,
} from './official-rule-helpers.ts'
import type { LocalizedText } from '../../src/domain/types/common.ts'

/**
 * 场景/冒险域：affiliation/campaign/adventure/scene map + adventure/variant 归一化 +
 * area highlight + monster 目录 + patron。从 normalize-idle-champions-definitions 拆出。
 */

type RawDefinition = Record<string, unknown>
type LocalizedDefinition = RawDefinition | null | undefined
type AttackType = 'melee' | 'ranged' | 'magic' | 'other'

interface CampaignEntry {
  id: string
  original: string
  display: string
}

interface SceneEntry {
  id: string
  original: string
  display: string
}

interface AdventureMetadata {
  id: string
  name: LocalizedText
  themeName: LocalizedText
  campaign: CampaignEntry
  locationId: string | null
  areaSetId: string | null
  objectiveArea: number | null
  variantAdventureId: string | null
  isVariant: boolean
}

interface MonsterIdentity {
  id: string
  name: string
  tags: string[]
  attackType: AttackType
  isSpecial: boolean
}

interface MonsterCatalog {
  monstersById: Map<string, MonsterIdentity>
  monstersByAdventureId: Map<string, MonsterIdentity[]>
}

interface AreaHighlight {
  id: string
  kind: string
  start: number
  end: number | null
  loopAt: number | null
  repeatAt: number | null
}

interface RawAreaHighlight {
  kind: string
  start: number | null
  end: number | null
  loopAt: number | null
  repeatAt: number | null
}

interface AreaVisitContext {
  kind: string
  loopAt: number | null
  repeatAt: number | null
}

interface AreaRange {
  start: number | null
  end: number | null
}

interface AttackMix {
  melee: number
  ranged: number
  magic: number
  other: number
}

interface VariantEnemySummary {
  enemyCount: number
  enemyTypes: string[]
  enemyTypeCounts: Record<string, number>
  attackMix: AttackMix
  specialEnemyCount: number
  escortCount: number
}

interface HeroRestrictions {
  forcedHeroIds: string[]
  allowedHeroIds: string[]
  allowedTags: string[]
}

interface VariantMetadata extends VariantEnemySummary, HeroRestrictions {
  adventureId: string | null
  adventure: LocalizedText | null
  objectiveArea: number | null
  locationId: string | null
  areaSetId: string | null
  scene: SceneEntry | null
  areaHighlights: AreaHighlight[]
  areaMilestones: number[]
  mechanics: string[]
}

export interface NormalizedAdventure {
  id: string
  ruleContextId: string
  scenarioKind: 'adventure'
  name: LocalizedText
  campaign: CampaignEntry
  description: LocalizedText | null
  objectiveArea: number | null
  locationId: string | null
  areaSetId: string | null
  scene: SceneEntry | null
  requirements: LocalizedText[]
  restrictions: LocalizedText[]
  rewards: LocalizedText[]
  repeatable: boolean
  patronObjectiveTiers: ReturnType<typeof normalizePatronObjectiveTiers>
  modeTags: string[]
  mechanics: string[]
}

export interface NormalizedVariant {
  id: string
  ruleContextId: string
  scenarioKind: 'variant'
  name: LocalizedText
  campaign: CampaignEntry
  adventureId: string | null
  adventure: LocalizedText | null
  objectiveArea: number | null
  locationId: string | null
  areaSetId: string | null
  scene: SceneEntry | null
  restrictions: LocalizedText[]
  rewards: LocalizedText[]
  repeatable: boolean
  patronObjectiveTiers: ReturnType<typeof normalizePatronObjectiveTiers>
  modeTags: string[]
  enemyCount: number
  enemyTypes: string[]
  enemyTypeCounts: Record<string, number>
  attackMix: AttackMix
  specialEnemyCount: number
  escortCount: number
  areaHighlights: AreaHighlight[]
  areaMilestones: number[]
  mechanics: string[]
  forcedHeroIds: string[]
  allowedHeroIds: string[]
  allowedTags: string[]
}

export interface NormalizedManualFormationSlot {
  id: string
  row: number
  column: number
  x: number | undefined
  y: number | undefined
  adjacentSlotIds: string[] | undefined
}

export interface NormalizedManualFormation {
  id: string
  name: LocalizedText | null
  notes: LocalizedText | null
  slots: NormalizedManualFormationSlot[]
  applicableContexts: { kind: string; id: string }[] | undefined
  sourceContexts:
    | {
        kind: string
        id: string
        name: LocalizedText
        campaignId: string | undefined
        variantAdventureId: string | undefined
      }[]
    | undefined
}

// 从 enemyTypes 排除的"非类型"通用 tag：melee/ranged 由 attackMix 单独承载，
// hits_based/armor_based/static/flying 是伤害/移动机制，均不在 vulnerability 词表内。
// 'boss' 不在此列——vulnerability 效果（increase_damage_against_monster_tag）以 'boss'
// 为目标（hero-abilities 3 信号），enemyTypes 词表必须与 vulnerability 词表对齐，否则
// boss vulnerability 信号在 steadyStateScoring 条件性匹配时永远命中不了。
const GENERIC_MONSTER_TAGS = new Set<string>([
  'melee',
  'ranged',
  'hits_based',
  'armor_based',
  'static',
  'flying',
])

const SPECIAL_MONSTER_TAGS = new Set<string>(['boss', 'hits_based', 'armor_based', 'static'])

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

const STRUCTURAL_VARIANT_GAME_CHANGES = new Set<string>([
  'formation',
  'formation_saves_campaign_id',
  'initial_formation',
])

// ponytail: String() on unknown 触发 no-base-to-string；统一经此 helper 收口，对齐 .mjs 原始的 String() 行为。
function toStr(value: unknown): string {
  return String(value)
}

function asRawRecord(value: unknown): RawDefinition {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as RawDefinition)
    : {}
}

function asRawArray(value: unknown): RawDefinition[] {
  return Array.isArray(value) ? (value as RawDefinition[]) : []
}

function buildVariantEnemySummary(
  originalDefinition: RawDefinition,
  baseAdventureId: string,
  monsterCatalog: MonsterCatalog,
): VariantEnemySummary {
  const pool = new Map<string, MonsterIdentity>()

  for (const monster of monsterCatalog.monstersByAdventureId.get(baseAdventureId) ?? []) {
    pool.set(getMonsterIdentityKey(monster), monster)
  }

  for (const monsterId of collectMonsterIdsFromGameChange(originalDefinition.game_changes ?? [])) {
    const monster = monsterCatalog.monstersById.get(monsterId)

    if (monster) {
      pool.set(getMonsterIdentityKey(monster), monster)
    }
  }

  const attackMix: AttackMix = { melee: 0, ranged: 0, magic: 0, other: 0 }
  const enemyTypeCounts = new Map<string, number>()
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

  const escortCount = collectEscortNames(asRawArray(originalDefinition.game_changes)).length

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

export function buildVariantMetadataMap(
  originalDefinitions: readonly RawDefinition[],
  localizedDefinitions: readonly RawDefinition[],
  campaignMap: Map<string, CampaignEntry>,
  monsterCatalog: MonsterCatalog,
): Map<string, VariantMetadata> {
  const adventureMap = buildAdventureMap(originalDefinitions, localizedDefinitions, campaignMap)
  const sceneMap = buildSceneMap(adventureMap)
  const metadataById = new Map<string, VariantMetadata>()

  for (const definition of originalDefinitions) {
    if (!looksLikeVariant(definition)) {
      continue
    }

    const variantId = toStr(definition.id)
    const baseAdventureId =
      definition.variant_adventure_id !== undefined
        ? toStr(definition.variant_adventure_id)
        : null
    const adventure = baseAdventureId ? adventureMap.get(baseAdventureId) ?? null : null
    const sceneKey =
      adventure?.locationId ? `${adventure.campaign.id}:${adventure.locationId}` : null
    const scene = sceneKey ? sceneMap.get(sceneKey) ?? null : null
    const objectiveArea = extractObjectiveArea(definition)
    const areaHighlights = collectAreaHighlights(asRawArray(definition.game_changes))
    const enemySummary = buildVariantEnemySummary(definition, baseAdventureId ?? '', monsterCatalog)
    const mechanics = uniqueStrings(
      asRawArray(definition.game_changes)
        .map((gameChange) => toText(gameChange.type))
        .filter((value): value is string => value !== null),
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
      ...collectHeroRestrictions(asRawArray(definition.game_changes)),
    })
  }

  return metadataById
}

export function normalizeAdventure(
  originalDefinition: RawDefinition,
  localizedDefinition: LocalizedDefinition,
  adventureMetadata: AdventureMetadata,
  scene: SceneEntry | null,
): NormalizedAdventure {
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
  const patronObjectiveTiers = normalizePatronObjectiveTiers(
    asRawRecord(originalDefinition.patron_objectives),
  )
  const repeatable = Boolean(originalDefinition.repeatable)

  return {
    id: toStr(originalDefinition.id),
    ruleContextId: buildScenarioRuleContextId('adventure', toStr(originalDefinition.id)),
    scenarioKind: 'adventure',
    name: normalizeLocalizedText(
      originalDefinition.name,
      localizedDefinition?.name,
      `Adventure ${toStr(originalDefinition.id)}`,
    )!,
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
    mechanics: collectScenarioMechanics(asRawArray(originalDefinition.game_changes)),
  }
}

export function normalizeVariant(
  originalDefinition: RawDefinition,
  localizedDefinition: LocalizedDefinition,
  campaignMap: Map<string, CampaignEntry>,
  variantMetadataById: Map<string, VariantMetadata>,
): NormalizedVariant {
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
  const fallbackCampaignId = toStr(originalDefinition.campaign_id ?? '')
  const campaign = campaignMap.get(fallbackCampaignId) ?? {
    id: fallbackCampaignId,
    original: fallbackCampaignId,
    display: fallbackCampaignId,
  }
  const metadata = variantMetadataById.get(toStr(originalDefinition.id))
  const patronObjectiveTiers = normalizePatronObjectiveTiers(
    asRawRecord(originalDefinition.patron_objectives),
  )
  const repeatable = Boolean(originalDefinition.repeatable)

  return {
    id: toStr(originalDefinition.id),
    ruleContextId: buildScenarioRuleContextId('variant', toStr(originalDefinition.id)),
    scenarioKind: 'variant',
    name: normalizeLocalizedText(
      originalDefinition.name,
      localizedDefinition?.name,
      `Variant ${toStr(originalDefinition.id)}`,
    )!,
    campaign,
    adventureId: metadata?.adventureId ?? null,
    adventure: metadata?.adventure ?? null,
    objectiveArea: metadata?.objectiveArea ?? null,
    locationId: metadata?.locationId ?? null,
    areaSetId: metadata?.areaSetId ?? null,
    scene: metadata?.scene ?? null,
    restrictions: normalizeLocalizedTextList(originalRestrictions, displayRestrictions),
    rewards: normalizeLocalizedTextList(originalRewards, displayRewards),
    repeatable,
    patronObjectiveTiers,
    modeTags: buildScenarioModeTags('variant', repeatable, patronObjectiveTiers),
    enemyCount: metadata?.enemyCount ?? 0,
    enemyTypes: metadata?.enemyTypes ?? [],
    enemyTypeCounts: metadata?.enemyTypeCounts ?? {},
    attackMix: metadata?.attackMix ?? {
      melee: 0,
      ranged: 0,
      magic: 0,
      other: 0,
    },
    specialEnemyCount: metadata?.specialEnemyCount ?? 0,
    escortCount: metadata?.escortCount ?? 0,
    areaHighlights: metadata?.areaHighlights ?? [],
    areaMilestones: metadata?.areaMilestones ?? [],
    mechanics: metadata?.mechanics ?? [],
    forcedHeroIds: metadata?.forcedHeroIds ?? [],
    allowedHeroIds: metadata?.allowedHeroIds ?? [],
    allowedTags: metadata?.allowedTags ?? [],
  }
}

export function mergeVariants(
  autoVariants: readonly NormalizedVariant[],
  manualVariants: readonly NormalizedVariant[],
): NormalizedVariant[] {
  const merged = new Map<string, NormalizedVariant>(
    autoVariants.map((variant) => [variant.id, variant]),
  )

  for (const variant of manualVariants) {
    const id = toStr(variant.id)
    const existing = merged.get(id)
    merged.set(id, {
      ...(existing ?? {}),
      ...variant,
      id,
      restrictions: uniqueLocalizedTexts([
        ...(existing?.restrictions ?? []),
        ...toLocalizedOverrideList(variant.restrictions),
      ]),
      rewards: uniqueLocalizedTexts([
        ...(existing?.rewards ?? []),
        ...toLocalizedOverrideList(variant.rewards),
      ]),
    })
  }

  return Array.from(merged.values()).sort((left, right) => Number(left.id) - Number(right.id))
}

export function normalizeManualFormations(
  formations: readonly RawDefinition[] = [],
): NormalizedManualFormation[] {
  return formations
    .map((formation) => {
      const rawName = formation.name
      const name =
        typeof rawName === 'object' && rawName !== null
          ? normalizeLocalizedText(
              asRawRecord(rawName).original,
              asRawRecord(rawName).display,
              toStr(formation.id),
            )
          : normalizeLocalizedText(rawName, rawName, toStr(formation.id))
      const rawNotes = formation.notes
      const notes =
        typeof rawNotes === 'object' && rawNotes !== null
          ? normalizeLocalizedText(asRawRecord(rawNotes).original, asRawRecord(rawNotes).display)
          : normalizeLocalizedText(rawNotes, rawNotes)

      return {
        id: toStr(formation.id),
        name,
        notes,
        slots: asRawArray(formation.slots).map((slot) => ({
          id: toStr(slot.id),
          row: Number(slot.row),
          column: Number(slot.column),
          x: Number.isFinite(Number(slot.x)) ? Number(slot.x) : undefined,
          y: Number.isFinite(Number(slot.y)) ? Number(slot.y) : undefined,
          adjacentSlotIds: Array.isArray(slot.adjacentSlotIds)
            ? (slot.adjacentSlotIds as unknown[]).map((value) => toStr(value))
            : undefined,
        })),
        applicableContexts: Array.isArray(formation.applicableContexts)
          ? (formation.applicableContexts as RawDefinition[])
              .filter((context) => context.kind && context.id !== undefined)
              .map((context) => ({
                kind: toStr(context.kind),
                id: toStr(context.id),
              }))
          : undefined,
        sourceContexts: Array.isArray(formation.sourceContexts)
          ? (formation.sourceContexts as RawDefinition[])
              .filter(
                (context) => context.kind && context.id !== undefined && context.name,
              )
              .map((context): NonNullable<NormalizedManualFormation['sourceContexts']>[number] | null => {
                const contextNameRecord = asRawRecord(context.name)
                const contextName = normalizeLocalizedText(
                  contextNameRecord.original,
                  contextNameRecord.display,
                  `${toStr(context.kind)}-${toStr(context.id)}`,
                )

                if (!contextName) {
                  return null
                }

                return {
                  kind: toStr(context.kind),
                  id: toStr(context.id),
                  name: contextName,
                  campaignId:
                    context.campaignId !== undefined ? toStr(context.campaignId) : undefined,
                  variantAdventureId:
                    context.variantAdventureId !== undefined
                      ? toStr(context.variantAdventureId)
                      : undefined,
                }
              })
              .filter((value): value is NonNullable<typeof value> => value !== null)
          : undefined,
      }
    })
    .filter((formation): formation is NormalizedManualFormation & { name: LocalizedText } =>
      Boolean(formation.name),
    )
    .sort((left, right) => compareLocalizedText(left.name, right.name))
}

function stripAdventureFlavor(value: unknown): string | null {
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

function extractObjectiveArea(definition: RawDefinition = {}): number | null {
  const objectives = asRawArray(definition.objectives)
  let directObjective: RawDefinition | undefined
  for (const item of objectives) {
    const condition = item.condition
    if (condition === 'area' || condition === 'complete_area') {
      directObjective = item
      break
    }
  }
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

function collectEscortNames(gameChanges: readonly unknown[] = []): string[] {
  const names: string[] = []

  function visit(value: unknown, currentType: string | null = null): void {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, currentType)
      }

      return
    }

    if (!value || typeof value !== 'object') {
      return
    }

    const record = value as RawDefinition
    const nextType = typeof record.type === 'string' ? record.type : currentType

    if (nextType && nextType.startsWith('slot_escort') && Array.isArray(record.names)) {
      names.push(...toTextList(record.names))
    }

    for (const item of Object.values(record)) {
      visit(item, nextType)
    }
  }

  visit(gameChanges)
  return uniqueStrings(names)
}

function collectHeroRestrictions(gameChanges: readonly unknown[] = []): HeroRestrictions {
  const forcedHeroIds = new Set<string>()
  const allowedHeroIds = new Set<string>()
  const allowedTags = new Set<string>()
  let hasAllowed = false

  for (const change of gameChanges) {
    if (!change || typeof change !== 'object') {
      continue
    }
    const record = change as RawDefinition
    const type = typeof record.type === 'string' ? record.type : null

    if (type === 'force_use_heroes' && Array.isArray(record.hero_ids)) {
      for (const id of record.hero_ids) {
        if (id !== undefined && id !== null) {
          forcedHeroIds.add(toStr(id))
        }
      }
    }

    if (type === 'only_allow_crusaders') {
      hasAllowed = true
      const ids = asRawRecord(record.by_ids).ids
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (id !== undefined && id !== null) {
            allowedHeroIds.add(toStr(id))
          }
        }
      }
      const tags = asRawRecord(record.by_tags).tags
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

function buildAreaHighlightId(entry: RawAreaHighlight): string {
  return [
    entry.kind,
    entry.start ?? 'open',
    entry.end ?? 'open',
    entry.loopAt ?? 'loop',
    entry.repeatAt ?? 'repeat',
  ].join(':')
}

function pushAreaHighlight(result: Map<string, AreaHighlight>, entry: RawAreaHighlight): void {
  const start = normalizeNumber(entry.start) ?? normalizeNumber(entry.end)

  if (start === null) {
    return
  }

  const normalizedEntry: AreaHighlight = {
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

function parseAreaRange(rangeText: unknown): AreaRange | null {
  const normalized = toText(rangeText)

  if (!normalized) {
    return null
  }

  const parts = normalized
    .split(/[,-]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

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

function collectAreaHighlights(gameChanges: readonly unknown[] = []): AreaHighlight[] {
  const highlights = new Map<string, AreaHighlight>()

  function visit(value: unknown, context: AreaVisitContext): void {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, context)
      }

      return
    }

    if (!value || typeof value !== 'object') {
      return
    }

    const record = value as RawDefinition
    const loopAt = normalizeNumber(record.loop_at) ?? context.loopAt
    const repeatAt = normalizeNumber(record.repeat_at) ?? context.repeatAt
    const minArea = normalizeNumber(record.min_area)
    const maxArea = normalizeNumber(record.max_area)
    const startArea = normalizeNumber(record.start_area)
    const endArea = normalizeNumber(record.end_area)
    const areaRange = parseAreaRange(record.area_range)

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

    for (const item of Object.values(record)) {
      visit(item, {
        kind: context.kind,
        loopAt,
        repeatAt,
      })
    }
  }

  for (const gameChange of gameChanges) {
    const changeRecord = asRawRecord(gameChange)
    visit(gameChange, {
      kind: toText(changeRecord.type) ?? 'effect',
      loopAt: normalizeNumber(changeRecord.loop_at),
      repeatAt: normalizeNumber(changeRecord.repeat_at),
    })
  }

  return Array.from(highlights.values()).sort(
    (left, right) =>
      left.start - right.start ||
      (left.end ?? Number.MAX_SAFE_INTEGER) - (right.end ?? Number.MAX_SAFE_INTEGER) ||
      left.kind.localeCompare(right.kind),
  )
}

function classifyMonsterAttack(
  monster: RawDefinition,
  attackDefinitionsById: Map<string, RawDefinition>,
): AttackType {
  const tags = new Set(toStringList(monster.tags))

  if (tags.has('melee')) {
    return 'melee'
  }

  if (tags.has('ranged')) {
    return 'ranged'
  }

  const attackId = monster.attack_id !== undefined ? toStr(monster.attack_id) : null
  const attackName = attackId
    ? (toText(attackDefinitionsById.get(attackId)?.name)?.toLowerCase() ?? '')
    : ''

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

function normalizeMonsterIdentity(
  monster: RawDefinition,
  attackDefinitionsById: Map<string, RawDefinition>,
): MonsterIdentity {
  const tags = uniqueStrings(toStringList(monster.tags)).sort((left, right) =>
    left.localeCompare(right),
  )
  const attackType = classifyMonsterAttack(monster, attackDefinitionsById)

  return {
    id: toStr(monster.id),
    name: toText(monster.name) ?? `Monster ${toStr(monster.id)}`,
    tags,
    attackType,
    isSpecial: tags.some((tag) => SPECIAL_MONSTER_TAGS.has(tag)),
  }
}

export function buildMonsterCatalog(
  rawDefinitions: RawDefinition,
  attackDefinitionsById: Map<string, RawDefinition>,
): MonsterCatalog {
  const monstersById = new Map<string, MonsterIdentity>()
  const monstersByAdventureId = new Map<string, MonsterIdentity[]>()

  for (const definition of asRawArray(rawDefinitions.monster_defines)) {
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

function getMonsterIdentityKey(monster: MonsterIdentity): string {
  return `${monster.name}\x00${monster.attackType}\x00${monster.tags.join('|')}`
}

function collectMonsterIdsFromGameChange(
  value: unknown,
  result: Set<string> = new Set(),
): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectMonsterIdsFromGameChange(item, result)
    }

    return result
  }

  if (!value || typeof value !== 'object') {
    return result
  }

  for (const [key, item] of Object.entries(value as RawDefinition)) {
    if (key === 'monster_id') {
      const monsterId = normalizeNumber(item)

      if (monsterId !== null) {
        result.add(toStr(monsterId))
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
      for (const replacementId of Object.values(item as RawDefinition)) {
        const normalized = normalizeNumber(replacementId)

        if (normalized !== null) {
          result.add(toStr(normalized))
        }
      }

      continue
    }

    collectMonsterIdsFromGameChange(item, result)
  }

  return result
}

export function buildAffiliationMap(
  originalDefinitions: readonly RawDefinition[] = [],
  localizedDefinitions: readonly RawDefinition[] = [],
): Map<string, LocalizedText> {
  const originalByTag = new Map<string, RawDefinition>()
  const localizedByTag = new Map<string, RawDefinition>()

  for (const definition of originalDefinitions) {
    const tag = definition.affiliation_tag ?? definition.tag ?? definition.key

    if (!tag) {
      continue
    }

    originalByTag.set(toStr(tag), definition)
  }

  for (const definition of localizedDefinitions) {
    const tag = definition.affiliation_tag ?? definition.tag ?? definition.key

    if (!tag) {
      continue
    }

    localizedByTag.set(toStr(tag), definition)
  }

  const tags = Array.from(new Set([...originalByTag.keys(), ...localizedByTag.keys()]))

  return new Map(
    tags
      .map((tag): [string, LocalizedText] | null => {
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
      .filter((value): value is [string, LocalizedText] => value !== null),
  )
}

export function buildCampaignMap(
  originalDefinitions: readonly RawDefinition[] = [],
  localizedDefinitions: readonly RawDefinition[] = [],
): Map<string, CampaignEntry> {
  const originalById = new Map<string, RawDefinition>()
  const localizedById = new Map<string, RawDefinition>()

  for (const definition of originalDefinitions) {
    const id = definition.id ?? definition.campaign_id

    if (id === undefined) {
      continue
    }

    originalById.set(toStr(id), definition)
  }

  for (const definition of localizedDefinitions) {
    const id = definition.id ?? definition.campaign_id

    if (id === undefined) {
      continue
    }

    localizedById.set(toStr(id), definition)
  }

  const ids = Array.from(new Set([...originalById.keys(), ...localizedById.keys()]))

  return new Map(
    ids
      .map((id): [string, CampaignEntry] | null => {
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
      .filter((value): value is [string, CampaignEntry] => value !== null),
  )
}

export function buildIdMap(definitions: readonly RawDefinition[] = []): Map<string, RawDefinition> {
  const result = new Map<string, RawDefinition>()

  for (const definition of definitions) {
    const id = definition.id

    if (id === undefined) {
      continue
    }

    result.set(toStr(id), definition)
  }

  return result
}

export function buildAdventureMap(
  originalDefinitions: readonly RawDefinition[] = [],
  localizedDefinitions: readonly RawDefinition[] = [],
  campaignMap: Map<string, CampaignEntry>,
): Map<string, AdventureMetadata> {
  const originalById = buildIdMap(originalDefinitions)
  const localizedById = buildIdMap(localizedDefinitions)
  const ids = Array.from(new Set([...originalById.keys(), ...localizedById.keys()]))

  return new Map(
    ids
      .map((id): [string, AdventureMetadata] | null => {
        const originalDefinition = originalById.get(id) ?? {}
        const localizedDefinition = localizedById.get(id) ?? {}
        const campaignId = toStr(originalDefinition.campaign_id ?? localizedDefinition.campaign_id ?? '')
        const campaign = campaignMap.get(campaignId) ?? {
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
                ? toStr(originalDefinition.location_id)
                : null,
            areaSetId:
              originalDefinition.area_set_id !== undefined
                ? toStr(originalDefinition.area_set_id)
                : null,
            objectiveArea: extractObjectiveArea(originalDefinition),
            variantAdventureId:
              originalDefinition.variant_adventure_id !== undefined
                ? toStr(originalDefinition.variant_adventure_id)
                : null,
            isVariant: looksLikeVariant(originalDefinition),
          },
        ]
      })
      .filter((value): value is [string, AdventureMetadata] => value !== null),
  )
}

export function buildSceneMap(adventureMap: Map<string, AdventureMetadata>): Map<string, SceneEntry> {
  const groupedScenes = new Map<
    string,
    { original: string; display: string; sourceAdventureId: string }
  >()

  for (const adventure of adventureMap.values()) {
    if (adventure.isVariant || !adventure.locationId) {
      continue
    }

    const key = `${adventure.campaign.id}:${adventure.locationId}`
    const current = groupedScenes.get(key)

    if (!current || Number(adventure.id) < Number(current.sourceAdventureId)) {
      groupedScenes.set(key, {
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

export function normalizePatrons(
  originalDefinitions: readonly RawDefinition[] = [],
  localizedDefinitions: readonly RawDefinition[] = [],
): NonNullable<ReturnType<typeof normalizePatronDefinition>>[] {
  const localizedById = buildIdMap(localizedDefinitions)

  return originalDefinitions
    .map((definition) =>
      normalizePatronDefinition(
        definition,
        localizedById.get(toStr(definition.id)) ?? definition,
      ),
    )
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .sort((left, right) => Number(left.id) - Number(right.id))
}

function collectScenarioMechanics(gameChanges: readonly unknown[] = []): string[] {
  return uniqueStrings(
    (gameChanges ?? [])
      .map((gameChange) => toText(asRawRecord(gameChange).type))
      .filter((value): value is string => value !== null),
  )
    .filter((gameChangeType) => !STRUCTURAL_VARIANT_GAME_CHANGES.has(gameChangeType))
    .sort((left, right) => left.localeCompare(right))
}

function getDefinitionName(definition: RawDefinition = {}): unknown {
  return definition.name ?? definition.label ?? definition.campaign_name
}
