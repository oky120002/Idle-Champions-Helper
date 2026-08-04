import type { JsonValue, LocalizedText } from '../../src/domain/types/common.ts'
import {
  compareLocalizedText,
  normalizeJsonValue,
  normalizeLocalizedText,
  normalizeNumber,
  toText,
} from './normalize-text-utils.ts'

type RawDefinition = Record<string, unknown>

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

function normalizeBooleanFlag(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  const text = toText(value)
  if (text === null) {
    return false
  }

  return text !== '0' && text.toLowerCase() !== 'false'
}

function normalizeRemainingProperties(value: unknown, consumedKeys: readonly string[] = []): JsonValue | null {
  if (Array.isArray(value)) {
    return value.length > 0 ? normalizeJsonValue(value) : null
  }

  if (value === null || typeof value !== 'object') {
    return null
  }

  const consumed = new Set(consumedKeys)
  const entries = Object.entries(value).filter(([key]) => !consumed.has(key))

  if (entries.length === 0) {
    return null
  }

  return normalizeJsonValue(Object.fromEntries(entries))
}

function normalizeLocalizedTextRecord(
  originalValue: unknown,
  displayValue: unknown,
): Record<string, LocalizedText> | null {
  const originalEntries = typeof originalValue === 'object' && originalValue !== null ? Object.entries(originalValue as RawDefinition) : []
  const displayEntries = typeof displayValue === 'object' && displayValue !== null ? Object.entries(displayValue as RawDefinition) : []
  const keys = [...new Set([...originalEntries.map(([key]) => key), ...displayEntries.map(([key]) => key)])].sort(
    (left, right) => left.localeCompare(right),
  )

  if (keys.length === 0) {
    return null
  }

  const record: Record<string, LocalizedText> = {}
  const originalRecord = originalValue as RawDefinition | null | undefined
  const displayRecord = displayValue as RawDefinition | null | undefined

  for (const key of keys) {
    const localized = normalizeLocalizedText(
      originalRecord?.[key],
      displayRecord?.[key],
      key,
    )

    if (localized) {
      record[key] = localized
    }
  }

  return Object.keys(record).length > 0 ? record : null
}

function normalizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return []
  }

  return Array.from(
    new Set(
      values
        .map((value) => toText(value))
        .filter((value): value is string => value !== null),
    ),
  ).sort((left, right) => left.localeCompare(right))
}

export interface EffectStringReference {
  effectString: string
  key: string
  args: string[]
  effectDefinitionId: string | null
}

export function normalizeEffectStringReference(effectStringValue: unknown): EffectStringReference | null {
  const effectString = toText(effectStringValue)

  if (effectString === null) {
    return null
  }

  const [key = '', ...args] = effectString.split(',').map((item) => item.trim())
  const firstArg = args[0]
  const effectDefinitionId =
    key === 'effect_def' && typeof firstArg === 'string' && firstArg.trim() ? firstArg.trim() : null

  return {
    effectString,
    key,
    args,
    effectDefinitionId,
  }
}

function normalizeTextMapEntries(
  originalValue: unknown,
  displayValue: unknown,
): LocalizedText[] {
  const originalEntries = typeof originalValue === 'object' && originalValue !== null ? Object.entries(originalValue as RawDefinition) : []
  const displayEntries = typeof displayValue === 'object' && displayValue !== null ? Object.entries(displayValue as RawDefinition) : []
  const keys = [...new Set([...originalEntries.map(([key]) => key), ...displayEntries.map(([key]) => key)])]
  const originalRecord = originalValue as RawDefinition | null | undefined
  const displayRecord = displayValue as RawDefinition | null | undefined

  return keys
    .map((key) =>
      normalizeLocalizedText(
        originalRecord?.[key],
        displayRecord?.[key],
        key,
      ),
    )
    .filter((value): value is LocalizedText => value !== null)
    .sort(compareLocalizedText)
}

function normalizeDateString(value: unknown): number | null {
  const text = toText(value)
  if (text === null) {
    return null
  }

  const iso = text.includes('T') ? text : text.replace(' ', 'T')
  const parsed = Date.parse(iso.endsWith('Z') ? iso : `${iso}Z`)
  return Number.isFinite(parsed) ? parsed : null
}

function buildTagRequirementFromExpression(expression: unknown): string[] | null {
  if (typeof expression !== 'string') {
    return null
  }

  const normalized = expression.trim()
  const negatedDisjunctionMatch = /^!\(([^)]+)\)$/.exec(normalized)
  if (negatedDisjunctionMatch === null) {
    return null
  }

  const tags = (negatedDisjunctionMatch[1] ?? '')
    .split('|')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  return tags.length > 0 ? tags : null
}

interface PatronStatRule {
  stat: string
  operator: string
  value: number
}

type PatronEligibilityRule =
  | {
      type: 'tags'
      rawExpression: string
      requiredAnyTags: string[] | null
      supported: boolean
    }
  | {
      type: 'stats'
      blockedWhen: 'any' | 'all'
      stats: PatronStatRule[]
      supported: true
    }
  | {
      type: 'time_available_days'
      rawExpression: string
      maxAgeDays: number | null
      supported: boolean
    }

function normalizePatronEligibilityRule(change: unknown): PatronEligibilityRule[] {
  if (change === null || typeof change !== 'object') {
    return []
  }

  const changeRecord = change as RawDefinition
  if (changeRecord.type !== 'disallow_crusaders') {
    return []
  }

  const rules: PatronEligibilityRule[] = []

  const byTags = asRawRecord(changeRecord.by_tags)
  if (byTags.tags !== undefined && byTags.tags !== null) {
    rules.push({
      type: 'tags',
      rawExpression: toStr(byTags.tags),
      requiredAnyTags: buildTagRequirementFromExpression(byTags.tags),
      supported: Array.isArray(buildTagRequirementFromExpression(byTags.tags)),
    })
  }

  const byStat = asRawRecord(changeRecord.by_stat)
  if (Array.isArray(byStat.stats) && byStat.stats.length > 0) {
    rules.push({
      type: 'stats',
      blockedWhen: byStat.pass_any === true ? 'any' : 'all',
      stats: byStat.stats
        .map((statRule): PatronStatRule | null => {
          const statRuleRecord = asRawRecord(statRule)
          const stat = typeof statRuleRecord.stat === 'string' ? statRuleRecord.stat.toLowerCase() : null
          const operator = typeof statRuleRecord.comp === 'string' ? statRuleRecord.comp : null
          const value = normalizeNumber(statRuleRecord.value)

          if (stat === null || stat === '' || operator === null || operator === '' || value === null) {
            return null
          }

          return { stat, operator, value }
        })
        .filter((rule): rule is PatronStatRule => rule !== null),
      supported: true,
    })
  }

  const byExpr = asRawRecord(changeRecord.by_expr)
  if (byExpr.expr !== undefined && byExpr.expr !== null) {
    const rawExpression = toStr(byExpr.expr)
    const thresholdMatch = /^TimeAvailable\(`days`\)>\(?(\d+)\*(\d+)\)?$/.exec(rawExpression.replace(/\s/g, ''))
    const maxAgeDays = thresholdMatch ? Number(thresholdMatch[1]) * Number(thresholdMatch[2]) : null

    rules.push({
      type: 'time_available_days',
      supported: maxAgeDays !== null,
      rawExpression,
      maxAgeDays,
    })
  }

  return rules
}

function collectForcedHeroIds(gameChanges: RawDefinition = {}): string[] {
  return Object.values(gameChanges)
    .flatMap((changes) => (Array.isArray(changes) ? (changes as unknown[]) : []))
    .filter((change): change is RawDefinition => {
      return asRawRecord(change).type === 'force_allow_hero'
    })
    .flatMap((change) => {
      const heroIds = asRawRecord(change).hero_ids
      return Array.isArray(heroIds) ? (heroIds as unknown[]) : []
    })
    .map((heroId) => toStr(heroId))
    .filter((value): value is string => value !== '')
    .sort((left, right) => Number(left) - Number(right))
}

export interface PatronDefinition {
  id: string
  name: LocalizedText
  description: LocalizedText | null
  shortName: string | null
  restrictionsText: LocalizedText[]
  minObjectiveLevel: number | null
  defaultObjectiveBump: number | null
  weeklyFreePlayCap: number | null
  forceAllowedHeroIds: string[]
  eligibilityRules: PatronEligibilityRule[]
  evaluationStatus: 'complete' | 'partial'
}

export function normalizePatronDefinition(
  originalDefinition: RawDefinition = {},
  localizedDefinition: RawDefinition = {},
): PatronDefinition | null {
  const name = normalizeLocalizedText(
    originalDefinition.name,
    localizedDefinition.name,
    `Patron ${toStr(originalDefinition.id ?? 'unknown')}`,
  )

  if (!name) {
    return null
  }

  const gameChanges = asRawRecord(originalDefinition.game_changes)
  const rules = Object.values(gameChanges)
    .flatMap((changes) => (Array.isArray(changes) ? (changes as unknown[]) : []))
    .flatMap((change) => normalizePatronEligibilityRule(change))

  return {
    id: toStr(originalDefinition.id),
    description: normalizeLocalizedText(
      originalDefinition.description,
      localizedDefinition.description,
    ),
    shortName: toText(asRawRecord(originalDefinition.properties).short_name) ?? null,
    restrictionsText: normalizeTextMapEntries(
      originalDefinition.restrictions_text,
      localizedDefinition.restrictions_text,
    ),
    minObjectiveLevel: normalizeNumber(asRawRecord(originalDefinition.properties).min_objective_level),
    defaultObjectiveBump: normalizeNumber(asRawRecord(originalDefinition.properties).default_objective_bump),
    weeklyFreePlayCap: normalizeNumber(originalDefinition.weekly_free_play_cap),
    forceAllowedHeroIds: collectForcedHeroIds(gameChanges),
    eligibilityRules: rules,
    evaluationStatus: rules.every((rule) => rule.supported !== false) ? 'complete' : 'partial',
    name,
  }
}

function compareRuleValue(left: number, operator: string, right: number): boolean {
  switch (operator) {
    case '<':
      return left < right
    case '<=':
      return left <= right
    case '>':
      return left > right
    case '>=':
      return left >= right
    case '==':
      return left === right
    default:
      return false
  }
}

interface ChampionRestrictionFacts {
  heroId: string
  tags: Set<string>
  abilityScores: Record<string, number>
  timeAvailableDays: number | null
}

function buildChampionRestrictionFacts(
  heroDefinition: RawDefinition = {},
  updatedAt: unknown,
): ChampionRestrictionFacts {
  const abilityScores = asRawRecord(heroDefinition.character_sheet_details).ability_scores
  const availableDate =
    normalizeDateString(heroDefinition.last_rework_date) ??
    normalizeDateString(heroDefinition.date_available)
  const updatedAtDate = normalizeDateString(updatedAt)

  let timeAvailableDays = null
  if (availableDate !== null && updatedAtDate !== null && updatedAtDate >= availableDate) {
    timeAvailableDays = Math.floor((updatedAtDate - availableDate) / 86_400_000)
  }

  return {
    heroId: toStr(heroDefinition.id),
    tags: new Set(
      (Array.isArray(heroDefinition.tags) ? heroDefinition.tags : [])
        .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
        .filter(Boolean),
    ),
    abilityScores: Object.fromEntries(
      Object.entries(asRawRecord(abilityScores))
        .map(([key, value]) => [key.toLowerCase(), normalizeNumber(value)])
        .filter(([, value]) => value !== null) as [string, number][],
    ),
    timeAvailableDays,
  }
}

function matchesPatronEligibilityRule(
  facts: ChampionRestrictionFacts,
  rule: PatronEligibilityRule,
): boolean {
  if (rule.supported === false) {
    return false
  }

  if (rule.type === 'tags') {
    if (!Array.isArray(rule.requiredAnyTags) || rule.requiredAnyTags.length === 0) {
      return false
    }

    return rule.requiredAnyTags.some((tag) => facts.tags.has(tag))
  }

  if (rule.type === 'stats') {
    const checks = rule.stats.map((statRule) => {
      const statValue = facts.abilityScores[statRule.stat]
      return typeof statValue === 'number'
        ? compareRuleValue(statValue, statRule.operator, statRule.value)
        : true
    })

    return rule.blockedWhen === 'any' ? !checks.some(Boolean) : !checks.every(Boolean)
  }

  if (facts.timeAvailableDays === null || rule.maxAgeDays === null) {
    return false
  }

  return facts.timeAvailableDays <= rule.maxAgeDays
}

export interface ChampionPatronEligibility {
  eligiblePatronIds: string[]
  ruleQualifiedPatronIds: string[]
  forcedEligiblePatronIds: string[]
  unsupportedPatronIds: string[]
}

export function buildChampionPatronEligibility(
  heroDefinition: RawDefinition,
  patrons: readonly PatronDefinition[],
  updatedAt: unknown,
): ChampionPatronEligibility {
  const facts = buildChampionRestrictionFacts(heroDefinition, updatedAt)
  const eligiblePatronIds: string[] = []
  const ruleQualifiedPatronIds: string[] = []
  const forcedEligiblePatronIds: string[] = []
  const unsupportedPatronIds: string[] = []

  for (const patron of patrons) {
    if (patron.evaluationStatus !== 'complete') {
      unsupportedPatronIds.push(patron.id)
    }

    const forceAllowed = patron.forceAllowedHeroIds.includes(facts.heroId)
    const ruleQualified =
      patron.evaluationStatus === 'complete' &&
      patron.eligibilityRules.every((rule) => matchesPatronEligibilityRule(facts, rule))

    if (forceAllowed) {
      forcedEligiblePatronIds.push(patron.id)
    }

    if (ruleQualified) {
      ruleQualifiedPatronIds.push(patron.id)
    }

    if (forceAllowed || ruleQualified) {
      eligiblePatronIds.push(patron.id)
    }
  }

  eligiblePatronIds.sort((left, right) => Number(left) - Number(right))
  ruleQualifiedPatronIds.sort((left, right) => Number(left) - Number(right))
  forcedEligiblePatronIds.sort((left, right) => Number(left) - Number(right))
  unsupportedPatronIds.sort((left, right) => Number(left) - Number(right))

  return {
    eligiblePatronIds,
    ruleQualifiedPatronIds,
    forcedEligiblePatronIds,
    unsupportedPatronIds,
  }
}

function extractObjectiveAreaFromObjectives(objectives: readonly unknown[] = []): number | null {
  const directObjective = objectives.find((item) => {
    const condition = asRawRecord(item).condition
    return condition === 'complete_area' || condition === 'area'
  })

  return normalizeNumber(directObjective === undefined ? undefined : asRawRecord(directObjective).area)
}

export interface PatronObjectiveTier {
  patronId: string
  tierId: string
  objectiveArea: number | null
  objectives: unknown[]
}

export function normalizePatronObjectiveTiers(
  patronObjectives: RawDefinition = {},
): PatronObjectiveTier[] {
  const result: PatronObjectiveTier[] = []

  for (const [patronId, tiers] of Object.entries(patronObjectives)) {
    if (tiers === null || typeof tiers !== 'object') {
      continue
    }

    for (const [tierId, objectives] of Object.entries(tiers as RawDefinition)) {
      result.push({
        patronId: toStr(patronId),
        tierId: toStr(tierId),
        objectiveArea: extractObjectiveAreaFromObjectives(Array.isArray(objectives) ? objectives : []),
        objectives: Array.isArray(objectives) ? objectives : [],
      })
    }
  }

  return result.sort(
    (left, right) =>
      Number(left.patronId) - Number(right.patronId) ||
      Number(left.tierId) - Number(right.tierId),
  )
}

export function buildScenarioRuleContextId(kind: string, id: string | number): string {
  return `${kind}:${id}`
}

export function buildScenarioModeTags(
  kind: string,
  repeatable: unknown,
  patronObjectiveTiers: readonly unknown[] = [],
): string[] {
  const tags = [kind]

  if (normalizeBooleanFlag(repeatable)) {
    tags.push('free_play')
  }

  if (Array.isArray(patronObjectiveTiers) && patronObjectiveTiers.length > 0) {
    tags.push('patron')
  }

  return tags
}

export interface OfficialGameRuleDefinition {
  id: string
  ruleName: string
  topLevelKeys: string[]
  rule: JsonValue
}

export function normalizeOfficialGameRuleDefinition(
  definition: RawDefinition = {},
): OfficialGameRuleDefinition | null {
  const ruleName = toText(definition.rule_name)

  if (ruleName === null) {
    return null
  }

  const rule =
    typeof definition.rule === 'object' && definition.rule !== null
      ? normalizeJsonValue(definition.rule)
      : normalizeJsonValue(definition.rule ?? null)

  return {
    id: toStr(definition.id),
    topLevelKeys:
      typeof rule === 'object' && rule !== null && !Array.isArray(rule)
        ? Object.keys(rule).sort((left, right) => left.localeCompare(right))
        : [],
    ruleName,
    rule,
  }
}

export interface OfficialStatDefinition {
  id: string
  name: string
  multiKey: boolean
  clearOnReset: boolean
  serverOnly: boolean
  readOnly: boolean
  properties: JsonValue | null
}

export function normalizeOfficialStatDefinition(
  definition: RawDefinition = {},
): OfficialStatDefinition | null {
  const name = toText(definition.name)

  if (name === null) {
    return null
  }

  return {
    id: toStr(definition.id),
    multiKey: normalizeBooleanFlag(definition.multi_key),
    clearOnReset: normalizeBooleanFlag(definition.clear_on_reset),
    serverOnly: normalizeBooleanFlag(definition.server_only),
    readOnly: normalizeBooleanFlag(definition.read_only),
    properties: normalizeRemainingProperties(definition.properties),
    name,
  }
}

export interface OfficialBuffDefinition {
  id: string
  name: LocalizedText
  description: LocalizedText | null
  pluralName: LocalizedText | null
  effect: EffectStringReference | null
  rarity: number | null
  duration: number | null
  graphicId: string | null
  inventoryGraphicId: string | null
  odds: number | null
  inventoryOrder: number | null
  tags: string[]
  properties: JsonValue | null
}

export function normalizeOfficialBuffDefinition(
  originalDefinition: RawDefinition = {},
  localizedDefinition: RawDefinition = {},
): OfficialBuffDefinition | null {
  const name = normalizeLocalizedText(
    originalDefinition.name,
    localizedDefinition.name,
    `Buff ${toStr(originalDefinition.id ?? 'unknown')}`,
  )

  if (name === null) {
    return null
  }

  const properties = asRawRecord(originalDefinition.properties)
  const localizedProperties = asRawRecord(localizedDefinition.properties)

  return {
    id: toStr(originalDefinition.id),
    description: normalizeLocalizedText(
      originalDefinition.description,
      localizedDefinition.description,
    ),
    pluralName: normalizeLocalizedText(
      asRawRecord(originalDefinition.properties).name_plural,
      localizedProperties.name_plural,
    ),
    effect: normalizeEffectStringReference(originalDefinition.effect),
    rarity: normalizeNumber(originalDefinition.rarity),
    duration: normalizeNumber(originalDefinition.duration),
    graphicId:
      originalDefinition.graphic_id === undefined || originalDefinition.graphic_id === null
        ? null
        : toStr(originalDefinition.graphic_id),
    inventoryGraphicId:
      properties.inventory_graphic_id === undefined ||
      properties.inventory_graphic_id === null
        ? null
        : toStr(properties.inventory_graphic_id),
    odds: normalizeNumber(originalDefinition.odds),
    inventoryOrder: normalizeNumber(originalDefinition.inventory_order),
    tags: normalizeStringArray(originalDefinition.tags),
    properties: normalizeRemainingProperties(originalDefinition.properties, [
      'inventory_graphic_id',
      'name_plural',
    ]),
    name,
  }
}

interface EffectKeyParam {
  name: string
  type: string | null
}

function normalizeEffectKeyParamNames(value: unknown): EffectKeyParam[] {
  const text = toText(value)

  if (text === null) {
    return []
  }

  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const parts = item.split(/\s+/).filter(Boolean)

      if (parts.length === 1) {
        const name = parts[0]
        return name !== undefined ? { name, type: null } : null
      }

      const name = parts.at(-1)
      return name !== undefined
        ? {
            name,
            type: parts.slice(0, -1).join(' '),
          }
        : null
    })
    .filter((value): value is EffectKeyParam => value !== null)
}

export interface OfficialEffectKeyDefinition {
  id: string
  key: string
  owner: string | null
  paramNames: EffectKeyParam[]
  descriptions: Record<string, LocalizedText> | null
  negative: boolean
  properties: JsonValue | null
}

export function normalizeOfficialEffectKeyDefinition(
  originalDefinition: RawDefinition = {},
  localizedDefinition: RawDefinition = {},
): OfficialEffectKeyDefinition | null {
  const key = toText(originalDefinition.key)

  if (key === null) {
    return null
  }

  return {
    id: toStr(originalDefinition.id),
    owner: toText(originalDefinition.owner),
    paramNames: normalizeEffectKeyParamNames(originalDefinition.param_names),
    descriptions: normalizeLocalizedTextRecord(
      originalDefinition.descriptions,
      localizedDefinition.descriptions,
    ),
    negative: normalizeBooleanFlag(asRawRecord(originalDefinition.properties).negative),
    properties: normalizeRemainingProperties(originalDefinition.properties, ['negative']),
    key,
  }
}

function extractPurchasedPerkRequirementCount(requirements: unknown): number | null {
  if (!Array.isArray(requirements)) {
    return null
  }
  const matches = requirements
    .filter((requirement) => asRawRecord(requirement).condition === 'patron_perks_purchased')
    .map((requirement) => normalizeNumber(asRawRecord(requirement).amount))
    .filter((value): value is number => value !== null)

  return matches.length === 1 ? (matches[0] ?? null) : null
}

export interface PatronPerkTierDefinition {
  id: string
  patronId: string | null
  tierId: string | null
  requiredPurchasedPerkCount: number | null
  requirements: JsonValue[]
}

export function normalizePatronPerkTierDefinition(
  definition: RawDefinition = {},
): PatronPerkTierDefinition | null {
  const patronId =
    definition.patron_id === undefined || definition.patron_id === null
      ? null
      : toStr(definition.patron_id)
  const tierId =
    definition.tier_id === undefined || definition.tier_id === null ? null : toStr(definition.tier_id)

  if (patronId === null || tierId === null) {
    return null
  }

  const requirements = Array.isArray(definition.requirements)
    ? definition.requirements.map((requirement) => normalizeJsonValue(requirement))
    : []

  return {
    id: toStr(definition.id),
    requiredPurchasedPerkCount: extractPurchasedPerkRequirementCount(definition.requirements),
    patronId,
    tierId,
    requirements,
  }
}

interface PatronPerkCost {
  baseCost: number | null
  scaling: number | null
}

function normalizePatronPerkCost(cost: unknown): PatronPerkCost | null {
  if (cost === null || typeof cost !== 'object') {
    return null
  }

  const costRecord = cost as RawDefinition
  const baseCost = normalizeNumber(costRecord.base_cost)
  const scaling = normalizeNumber(costRecord.scaling)

  if (baseCost === null && scaling === null) {
    return null
  }

  return {
    baseCost,
    scaling,
  }
}

interface PatronPerkEffect {
  effectString: string
  key: string
  args: string[]
  perLevel: number | null
  targetName: string | null
  effectDefinitionId: string | null
}

function normalizePatronPerkEffect(effect: RawDefinition = {}): PatronPerkEffect | null {
  const effectReference = normalizeEffectStringReference(effect.effect_string)

  if (!effectReference) {
    return null
  }

  return {
    effectString: effectReference.effectString,
    key: effectReference.key,
    args: effectReference.args,
    perLevel: normalizeNumber(effect.per_level),
    targetName: toText(effect.target_name),
    effectDefinitionId: effectReference.effectDefinitionId,
  }
}

export interface PatronPerkDefinition {
  id: string
  patronId: string | null
  tierId: string | null
  name: LocalizedText
  graphicId: string | null
  typeId: number | null
  levels: number | null
  cost: PatronPerkCost | null
  effects: PatronPerkEffect[]
  effectDefinitionIds: string[]
  properties: JsonValue
}

export function normalizePatronPerkDefinition(
  originalDefinition: RawDefinition = {},
  localizedDefinition: RawDefinition = {},
): PatronPerkDefinition | null {
  const patronId =
    originalDefinition.patron_id === undefined || originalDefinition.patron_id === null
      ? null
      : toStr(originalDefinition.patron_id)
  const tierId =
    originalDefinition.tier_id === undefined || originalDefinition.tier_id === null
      ? null
      : toStr(originalDefinition.tier_id)
  const name = normalizeLocalizedText(
    originalDefinition.name,
    localizedDefinition.name,
    `Patron Perk ${toStr(originalDefinition.id ?? 'unknown')}`,
  )

  if (patronId === null || tierId === null || name === null) {
    return null
  }

  const effects = asRawArray(originalDefinition.effects)
    .map((effect) => normalizePatronPerkEffect(effect))
    .filter((value): value is PatronPerkEffect => value !== null)

  return {
    id: toStr(originalDefinition.id),
    graphicId:
      originalDefinition.graphic_id === undefined || originalDefinition.graphic_id === null
        ? null
        : toStr(originalDefinition.graphic_id),
    typeId: normalizeNumber(originalDefinition.type),
    levels: normalizeNumber(originalDefinition.levels),
    cost: normalizePatronPerkCost(originalDefinition.cost),
    effectDefinitionIds: Array.from(
      new Set(
        effects
          .map((effect) => effect.effectDefinitionId)
          .filter((effectDefinitionId): effectDefinitionId is string => typeof effectDefinitionId === 'string' && effectDefinitionId !== ''),
      ),
    ).sort((left, right) => Number(left) - Number(right)),
    properties: normalizeJsonValue(originalDefinition.properties ?? []),
    patronId,
    tierId,
    name,
    effects,
  }
}

export interface TrialsAdventureMetadata {
  id: string | number
  isVariant: boolean
  name: unknown
  campaign: unknown
  objectiveArea?: number | null | undefined
  locationId?: unknown
  areaSetId?: unknown
}

export interface TrialsRoleDefinition {
  id: string
  name: LocalizedText
  description: LocalizedText | null
  graphicId: string | null
  adventureId: string | null
  scenarioKind: 'adventure' | 'variant' | null
  ruleContextId: string | null
  adventure: {
    id: TrialsAdventureMetadata['id']
    name: unknown
    campaign: unknown
    objectiveArea: number | null
    locationId: unknown
    areaSetId: unknown
  } | null
  position: { x: number | null; y: number | null }
}

export function normalizeTrialsRoleDefinition(
  originalDefinition: RawDefinition = {},
  localizedDefinition: RawDefinition = {},
  adventureMetadata: TrialsAdventureMetadata | null = null,
): TrialsRoleDefinition | null {
  const name = normalizeLocalizedText(
    originalDefinition.name,
    localizedDefinition.name,
    `Trials Role ${toStr(originalDefinition.id ?? 'unknown')}`,
  )

  if (name === null) {
    return null
  }

  const adventureId =
    originalDefinition.adventure_id === undefined || originalDefinition.adventure_id === null
      ? null
      : toStr(originalDefinition.adventure_id)
  let scenarioKind: 'adventure' | 'variant' | null = null
  if (adventureMetadata !== null) {
    scenarioKind = adventureMetadata.isVariant ? 'variant' : 'adventure'
  }

  return {
    id: toStr(originalDefinition.id),
    description: normalizeLocalizedText(
      originalDefinition.description,
      localizedDefinition.description,
    ),
    graphicId:
      originalDefinition.graphic_id === undefined || originalDefinition.graphic_id === null
        ? null
        : toStr(originalDefinition.graphic_id),
    ruleContextId:
      scenarioKind !== null && adventureMetadata?.id !== undefined
        ? buildScenarioRuleContextId(scenarioKind, adventureMetadata.id)
        : null,
    adventure: adventureMetadata !== null
      ? {
          id: adventureMetadata.id,
          name: adventureMetadata.name,
          campaign: adventureMetadata.campaign,
          objectiveArea: adventureMetadata.objectiveArea ?? null,
          locationId: adventureMetadata.locationId,
          areaSetId: adventureMetadata.areaSetId,
        }
      : null,
    position: {
      x: normalizeNumber(originalDefinition.location_position_x),
      y: normalizeNumber(originalDefinition.location_position_y),
    },
    name,
    adventureId,
    scenarioKind,
  }
}

interface TrialsDifficultyCost {
  costType: string
  difficultyTokenId: string | null
  amount: number | null
}

function normalizeTrialsDifficultyCost(cost: RawDefinition = {}): TrialsDifficultyCost | null {
  const costType = toText(cost.cost)

  if (costType === null) {
    return null
  }

  return {
    difficultyTokenId: toText(cost.difficulty_token_id),
    amount: normalizeNumber(cost.amount),
    costType,
  }
}

export interface TrialsDifficultyDefinition {
  id: string
  name: LocalizedText
  shortName: string | null
  description: LocalizedText | null
  graphicId: string | null
  points: number | null
  tiamatHealth: number | null
  costs: TrialsDifficultyCost[]
  rewardData: JsonValue
}

export function normalizeTrialsDifficultyDefinition(
  originalDefinition: RawDefinition = {},
  localizedDefinition: RawDefinition = {},
): TrialsDifficultyDefinition | null {
  const name = normalizeLocalizedText(
    originalDefinition.name,
    localizedDefinition.name,
    `Trials Difficulty ${toStr(originalDefinition.id ?? 'unknown')}`,
  )

  if (name === null) {
    return null
  }

  return {
    id: toStr(originalDefinition.id),
    shortName: toText(localizedDefinition.short_name) ?? toText(originalDefinition.short_name),
    description: normalizeLocalizedText(
      originalDefinition.description,
      localizedDefinition.description,
    ),
    graphicId:
      originalDefinition.graphic_id === undefined || originalDefinition.graphic_id === null
        ? null
        : toStr(originalDefinition.graphic_id),
    points: normalizeNumber(originalDefinition.points),
    tiamatHealth: normalizeNumber(originalDefinition.tiamat_health),
    costs: asRawArray(originalDefinition.cost)
      .map((cost) => normalizeTrialsDifficultyCost(cost))
      .filter((value): value is TrialsDifficultyCost => value !== null),
    rewardData: normalizeJsonValue(originalDefinition.reward_data ?? []),
    name,
  }
}
