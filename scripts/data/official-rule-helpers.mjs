import {
  compareLocalizedText,
  normalizeJsonValue,
  normalizeLocalizedText,
  normalizeNumber,
  toText,
} from './normalize-text-utils.ts'
function normalizeBooleanFlag(value) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  const text = toText(value)
  if (!text) {
    return false
  }

  return text !== '0' && text.toLowerCase() !== 'false'
}

function normalizeRemainingProperties(value, consumedKeys = []) {
  if (Array.isArray(value)) {
    return value.length > 0 ? normalizeJsonValue(value) : null
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const consumed = new Set(consumedKeys)
  const entries = Object.entries(value).filter(([key]) => !consumed.has(key))

  if (entries.length === 0) {
    return null
  }

  return normalizeJsonValue(Object.fromEntries(entries))
}

function normalizeLocalizedTextRecord(originalValue, displayValue) {
  const originalEntries = originalValue && typeof originalValue === 'object' ? Object.entries(originalValue) : []
  const displayEntries = displayValue && typeof displayValue === 'object' ? Object.entries(displayValue) : []
  const keys = [...new Set([...originalEntries.map(([key]) => key), ...displayEntries.map(([key]) => key)])].sort(
    (left, right) => left.localeCompare(right),
  )

  if (keys.length === 0) {
    return null
  }

  const record = {}

  for (const key of keys) {
    const localized = normalizeLocalizedText(
      originalValue?.[key],
      displayValue?.[key],
      key,
    )

    if (localized) {
      record[key] = localized
    }
  }

  return Object.keys(record).length > 0 ? record : null
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return []
  }

  return Array.from(
    new Set(
      values
        .map((value) => toText(value))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right))
}

export function normalizeEffectStringReference(effectStringValue) {
  const effectString = toText(effectStringValue)

  if (!effectString) {
    return null
  }

  const [key, ...args] = effectString.split(',').map((item) => item.trim())
  const effectDefinitionId =
    key === 'effect_def' && typeof args[0] === 'string' && args[0].trim() ? args[0].trim() : null

  return {
    effectString,
    key,
    args,
    effectDefinitionId,
  }
}

function normalizeTextMapEntries(originalValue, displayValue) {
  const originalEntries = originalValue && typeof originalValue === 'object' ? Object.entries(originalValue) : []
  const displayEntries = displayValue && typeof displayValue === 'object' ? Object.entries(displayValue) : []
  const keys = [...new Set([...originalEntries.map(([key]) => key), ...displayEntries.map(([key]) => key)])]

  return keys
    .map((key) =>
      normalizeLocalizedText(
        originalValue?.[key],
        displayValue?.[key],
        key,
      ),
    )
    .filter(Boolean)
    .sort(compareLocalizedText)
}

function normalizeDateString(value) {
  const text = toText(value)
  if (!text) {
    return null
  }

  const iso = text.includes('T') ? text : text.replace(' ', 'T')
  const parsed = Date.parse(iso.endsWith('Z') ? iso : `${iso}Z`)
  return Number.isFinite(parsed) ? parsed : null
}

function buildTagRequirementFromExpression(expression) {
  if (typeof expression !== 'string') {
    return null
  }

  const normalized = expression.trim()
  const negatedDisjunctionMatch = normalized.match(/^!\(([^)]+)\)$/)
  if (!negatedDisjunctionMatch) {
    return null
  }

  const tags = negatedDisjunctionMatch[1]
    .split('|')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  return tags.length > 0 ? tags : null
}

function normalizePatronEligibilityRule(change) {
  if (!change || typeof change !== 'object') {
    return []
  }

  if (change.type !== 'disallow_crusaders') {
    return []
  }

  const rules = []

  if (change.by_tags?.tags) {
    rules.push({
      type: 'tags',
      rawExpression: String(change.by_tags.tags),
      requiredAnyTags: buildTagRequirementFromExpression(change.by_tags.tags),
      supported: Array.isArray(buildTagRequirementFromExpression(change.by_tags.tags)),
    })
  }

  if (Array.isArray(change.by_stat?.stats) && change.by_stat.stats.length > 0) {
    rules.push({
      type: 'stats',
      blockedWhen: change.by_stat.pass_any === true ? 'any' : 'all',
      stats: change.by_stat.stats
        .map((statRule) => {
          const stat = typeof statRule?.stat === 'string' ? statRule.stat.toLowerCase() : null
          const operator = typeof statRule?.comp === 'string' ? statRule.comp : null
          const value = normalizeNumber(statRule?.value)

          if (!stat || !operator || value === null) {
            return null
          }

          return { stat, operator, value }
        })
        .filter(Boolean),
      supported: true,
    })
  }

  if (change.by_expr?.expr) {
    const rawExpression = String(change.by_expr.expr)
    const thresholdMatch = rawExpression.match(/^TimeAvailable\(`days`\)\s*>\s*\(?\s*(\d+)\s*\*\s*(\d+)\s*\)?$/)
    const maxAgeDays = thresholdMatch ? Number(thresholdMatch[1]) * Number(thresholdMatch[2]) : null

    rules.push({
      type: 'time_available_days',
      rawExpression,
      maxAgeDays,
      supported: maxAgeDays !== null,
    })
  }

  return rules
}

function collectForcedHeroIds(gameChanges = {}) {
  return Object.values(gameChanges)
    .flatMap((changes) => (Array.isArray(changes) ? changes : []))
    .filter((change) => change?.type === 'force_allow_hero')
    .flatMap((change) => (Array.isArray(change.hero_ids) ? change.hero_ids : []))
    .map((heroId) => String(heroId))
    .filter(Boolean)
    .sort((left, right) => Number(left) - Number(right))
}

export function normalizePatronDefinition(originalDefinition = {}, localizedDefinition = {}) {
  const name = normalizeLocalizedText(
    originalDefinition.name,
    localizedDefinition.name,
    `Patron ${originalDefinition.id ?? 'unknown'}`,
  )

  if (!name) {
    return null
  }

  const gameChanges = originalDefinition.game_changes ?? {}
  const rules = Object.values(gameChanges)
    .flatMap((changes) => (Array.isArray(changes) ? changes : []))
    .flatMap((change) => normalizePatronEligibilityRule(change))

  return {
    id: String(originalDefinition.id),
    name,
    description: normalizeLocalizedText(
      originalDefinition.description,
      localizedDefinition.description,
    ),
    shortName: toText(originalDefinition.properties?.short_name) ?? null,
    restrictionsText: normalizeTextMapEntries(
      originalDefinition.restrictions_text,
      localizedDefinition.restrictions_text,
    ),
    minObjectiveLevel: normalizeNumber(originalDefinition.properties?.min_objective_level),
    defaultObjectiveBump: normalizeNumber(originalDefinition.properties?.default_objective_bump),
    weeklyFreePlayCap: normalizeNumber(originalDefinition.weekly_free_play_cap),
    forceAllowedHeroIds: collectForcedHeroIds(gameChanges),
    eligibilityRules: rules,
    evaluationStatus: rules.every((rule) => rule.supported !== false) ? 'complete' : 'partial',
  }
}

function compareRuleValue(left, operator, right) {
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

function buildChampionRestrictionFacts(heroDefinition = {}, updatedAt) {
  const abilityScores = heroDefinition.character_sheet_details?.ability_scores ?? {}
  const availableDate =
    normalizeDateString(heroDefinition.last_rework_date) ??
    normalizeDateString(heroDefinition.date_available)
  const updatedAtDate = normalizeDateString(updatedAt)

  let timeAvailableDays = null
  if (availableDate !== null && updatedAtDate !== null && updatedAtDate >= availableDate) {
    timeAvailableDays = Math.floor((updatedAtDate - availableDate) / 86_400_000)
  }

  return {
    heroId: String(heroDefinition.id),
    tags: new Set(
      (Array.isArray(heroDefinition.tags) ? heroDefinition.tags : [])
        .map((tag) => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
        .filter(Boolean),
    ),
    abilityScores: Object.fromEntries(
      Object.entries(abilityScores)
        .map(([key, value]) => [key.toLowerCase(), normalizeNumber(value)])
        .filter(([, value]) => value !== null),
    ),
    timeAvailableDays,
  }
}

function matchesPatronEligibilityRule(facts, rule) {
  if (!rule || rule.supported === false) {
    return false
  }

  if (rule.type === 'tags') {
    if (!Array.isArray(rule.requiredAnyTags) || rule.requiredAnyTags.length === 0) {
      return false
    }

    return rule.requiredAnyTags.some((tag) => facts.tags.has(tag))
  }

  if (rule.type === 'stats') {
    const checks = (rule.stats ?? []).map((statRule) => {
      const statValue = facts.abilityScores[statRule.stat]
      return typeof statValue === 'number'
        ? compareRuleValue(statValue, statRule.operator, statRule.value)
        : true
    })

    return rule.blockedWhen === 'any' ? !checks.some(Boolean) : !checks.every(Boolean)
  }

  if (rule.type === 'time_available_days') {
    if (facts.timeAvailableDays === null || rule.maxAgeDays === null) {
      return false
    }

    return facts.timeAvailableDays <= rule.maxAgeDays
  }

  return false
}

export function buildChampionPatronEligibility(heroDefinition, patrons, updatedAt) {
  const facts = buildChampionRestrictionFacts(heroDefinition, updatedAt)
  const eligiblePatronIds = []
  const ruleQualifiedPatronIds = []
  const forcedEligiblePatronIds = []
  const unsupportedPatronIds = []

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

  return {
    eligiblePatronIds: eligiblePatronIds.sort((left, right) => Number(left) - Number(right)),
    ruleQualifiedPatronIds: ruleQualifiedPatronIds.sort((left, right) => Number(left) - Number(right)),
    forcedEligiblePatronIds: forcedEligiblePatronIds.sort((left, right) => Number(left) - Number(right)),
    unsupportedPatronIds: unsupportedPatronIds.sort((left, right) => Number(left) - Number(right)),
  }
}

function extractObjectiveAreaFromObjectives(objectives = []) {
  const directObjective = objectives.find((item) =>
    item?.condition === 'complete_area' || item?.condition === 'area',
  )

  return normalizeNumber(directObjective?.area)
}

export function normalizePatronObjectiveTiers(patronObjectives = {}) {
  const result = []

  for (const [patronId, tiers] of Object.entries(patronObjectives ?? {})) {
    if (!tiers || typeof tiers !== 'object') {
      continue
    }

    for (const [tierId, objectives] of Object.entries(tiers)) {
      result.push({
        patronId: String(patronId),
        tierId: String(tierId),
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

export function buildScenarioRuleContextId(kind, id) {
  return `${kind}:${id}`
}

export function buildScenarioModeTags(kind, repeatable, patronObjectiveTiers) {
  const tags = [kind]

  if (repeatable) {
    tags.push('free_play')
  }

  if (Array.isArray(patronObjectiveTiers) && patronObjectiveTiers.length > 0) {
    tags.push('patron')
  }

  return tags
}

export function normalizeOfficialGameRuleDefinition(definition = {}) {
  const ruleName = toText(definition.rule_name)

  if (!ruleName) {
    return null
  }

  const rule =
    definition.rule && typeof definition.rule === 'object'
      ? normalizeJsonValue(definition.rule)
      : normalizeJsonValue(definition.rule ?? null)

  return {
    id: String(definition.id),
    ruleName,
    topLevelKeys:
      rule && typeof rule === 'object' && !Array.isArray(rule)
        ? Object.keys(rule).sort((left, right) => left.localeCompare(right))
        : [],
    rule,
  }
}

export function normalizeOfficialStatDefinition(definition = {}) {
  const name = toText(definition.name)

  if (!name) {
    return null
  }

  return {
    id: String(definition.id),
    name,
    multiKey: normalizeBooleanFlag(definition.multi_key),
    clearOnReset: normalizeBooleanFlag(definition.clear_on_reset),
    serverOnly: normalizeBooleanFlag(definition.server_only),
    readOnly: normalizeBooleanFlag(definition.read_only),
    properties: normalizeRemainingProperties(definition.properties),
  }
}

export function normalizeOfficialBuffDefinition(originalDefinition = {}, localizedDefinition = {}) {
  const name = normalizeLocalizedText(
    originalDefinition.name,
    localizedDefinition.name,
    `Buff ${originalDefinition.id ?? 'unknown'}`,
  )

  if (!name) {
    return null
  }

  return {
    id: String(originalDefinition.id),
    name,
    description: normalizeLocalizedText(
      originalDefinition.description,
      localizedDefinition.description,
    ),
    pluralName: normalizeLocalizedText(
      originalDefinition.properties?.name_plural,
      localizedDefinition.properties?.name_plural,
    ),
    effect: normalizeEffectStringReference(originalDefinition.effect),
    rarity: normalizeNumber(originalDefinition.rarity),
    duration: normalizeNumber(originalDefinition.duration),
    graphicId:
      originalDefinition.graphic_id === undefined || originalDefinition.graphic_id === null
        ? null
        : String(originalDefinition.graphic_id),
    inventoryGraphicId:
      originalDefinition.properties?.inventory_graphic_id === undefined ||
      originalDefinition.properties?.inventory_graphic_id === null
        ? null
        : String(originalDefinition.properties.inventory_graphic_id),
    odds: normalizeNumber(originalDefinition.odds),
    inventoryOrder: normalizeNumber(originalDefinition.inventory_order),
    tags: normalizeStringArray(originalDefinition.tags),
    properties: normalizeRemainingProperties(originalDefinition.properties, [
      'inventory_graphic_id',
      'name_plural',
    ]),
  }
}

function normalizeEffectKeyParamNames(value) {
  const text = toText(value)

  if (!text) {
    return []
  }

  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const parts = item.split(/\s+/).filter(Boolean)

      if (parts.length === 1) {
        return {
          name: parts[0],
          type: null,
        }
      }

      return {
        name: parts.at(-1),
        type: parts.slice(0, -1).join(' '),
      }
    })
}

export function normalizeOfficialEffectKeyDefinition(originalDefinition = {}, localizedDefinition = {}) {
  const key = toText(originalDefinition.key)

  if (!key) {
    return null
  }

  return {
    id: String(originalDefinition.id),
    key,
    owner: toText(originalDefinition.owner),
    paramNames: normalizeEffectKeyParamNames(originalDefinition.param_names),
    descriptions: normalizeLocalizedTextRecord(
      originalDefinition.descriptions,
      localizedDefinition.descriptions,
    ),
    negative: normalizeBooleanFlag(originalDefinition.properties?.negative),
    properties: normalizeRemainingProperties(originalDefinition.properties, ['negative']),
  }
}

function extractPurchasedPerkRequirementCount(requirements = []) {
  const matches = requirements
    .filter((requirement) => requirement?.condition === 'patron_perks_purchased')
    .map((requirement) => normalizeNumber(requirement.amount))
    .filter((value) => value !== null)

  return matches.length === 1 ? matches[0] : null
}

export function normalizePatronPerkTierDefinition(definition = {}) {
  const patronId =
    definition.patron_id === undefined || definition.patron_id === null
      ? null
      : String(definition.patron_id)
  const tierId =
    definition.tier_id === undefined || definition.tier_id === null ? null : String(definition.tier_id)

  if (!patronId || !tierId) {
    return null
  }

  const requirements = Array.isArray(definition.requirements)
    ? definition.requirements.map((requirement) => normalizeJsonValue(requirement))
    : []

  return {
    id: String(definition.id),
    patronId,
    tierId,
    requiredPurchasedPerkCount: extractPurchasedPerkRequirementCount(requirements),
    requirements,
  }
}

function normalizePatronPerkCost(cost) {
  if (!cost || typeof cost !== 'object') {
    return null
  }

  const baseCost = normalizeNumber(cost.base_cost)
  const scaling = normalizeNumber(cost.scaling)

  if (baseCost === null && scaling === null) {
    return null
  }

  return {
    baseCost,
    scaling,
  }
}

function normalizePatronPerkEffect(effect = {}) {
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

export function normalizePatronPerkDefinition(originalDefinition = {}, localizedDefinition = {}) {
  const patronId =
    originalDefinition.patron_id === undefined || originalDefinition.patron_id === null
      ? null
      : String(originalDefinition.patron_id)
  const tierId =
    originalDefinition.tier_id === undefined || originalDefinition.tier_id === null
      ? null
      : String(originalDefinition.tier_id)
  const name = normalizeLocalizedText(
    originalDefinition.name,
    localizedDefinition.name,
    `Patron Perk ${originalDefinition.id ?? 'unknown'}`,
  )

  if (!patronId || !tierId || !name) {
    return null
  }

  const effects = (Array.isArray(originalDefinition.effects) ? originalDefinition.effects : [])
    .map((effect) => normalizePatronPerkEffect(effect))
    .filter(Boolean)

  return {
    id: String(originalDefinition.id),
    patronId,
    tierId,
    name,
    graphicId:
      originalDefinition.graphic_id === undefined || originalDefinition.graphic_id === null
        ? null
        : String(originalDefinition.graphic_id),
    typeId: normalizeNumber(originalDefinition.type),
    levels: normalizeNumber(originalDefinition.levels),
    cost: normalizePatronPerkCost(originalDefinition.cost),
    effects,
    effectDefinitionIds: Array.from(
      new Set(
        effects
          .map((effect) => effect.effectDefinitionId)
          .filter((effectDefinitionId) => typeof effectDefinitionId === 'string' && effectDefinitionId),
      ),
    ).sort((left, right) => Number(left) - Number(right)),
    properties: normalizeJsonValue(originalDefinition.properties ?? []),
  }
}

export function normalizeTrialsRoleDefinition(
  originalDefinition = {},
  localizedDefinition = {},
  adventureMetadata = null,
) {
  const name = normalizeLocalizedText(
    originalDefinition.name,
    localizedDefinition.name,
    `Trials Role ${originalDefinition.id ?? 'unknown'}`,
  )

  if (!name) {
    return null
  }

  const adventureId =
    originalDefinition.adventure_id === undefined || originalDefinition.adventure_id === null
      ? null
      : String(originalDefinition.adventure_id)
  const scenarioKind = adventureMetadata ? (adventureMetadata.isVariant ? 'variant' : 'adventure') : null

  return {
    id: String(originalDefinition.id),
    name,
    description: normalizeLocalizedText(
      originalDefinition.description,
      localizedDefinition.description,
    ),
    graphicId:
      originalDefinition.graphic_id === undefined || originalDefinition.graphic_id === null
        ? null
        : String(originalDefinition.graphic_id),
    adventureId,
    scenarioKind,
    ruleContextId:
      scenarioKind && adventureMetadata?.id
        ? buildScenarioRuleContextId(scenarioKind, adventureMetadata.id)
        : null,
    adventure: adventureMetadata
      ? {
          id: adventureMetadata.id,
          name: adventureMetadata.name,
          campaign: adventureMetadata.campaign,
          objectiveArea: adventureMetadata.objectiveArea ?? null,
          locationId: adventureMetadata.locationId ?? null,
          areaSetId: adventureMetadata.areaSetId ?? null,
        }
      : null,
    position: {
      x: normalizeNumber(originalDefinition.location_position_x),
      y: normalizeNumber(originalDefinition.location_position_y),
    },
  }
}

function normalizeTrialsDifficultyCost(cost = {}) {
  const costType = toText(cost.cost)

  if (!costType) {
    return null
  }

  return {
    costType,
    difficultyTokenId: toText(cost.difficulty_token_id),
    amount: normalizeNumber(cost.amount),
  }
}

export function normalizeTrialsDifficultyDefinition(originalDefinition = {}, localizedDefinition = {}) {
  const name = normalizeLocalizedText(
    originalDefinition.name,
    localizedDefinition.name,
    `Trials Difficulty ${originalDefinition.id ?? 'unknown'}`,
  )

  if (!name) {
    return null
  }

  return {
    id: String(originalDefinition.id),
    name,
    shortName: toText(localizedDefinition.short_name) ?? toText(originalDefinition.short_name),
    description: normalizeLocalizedText(
      originalDefinition.description,
      localizedDefinition.description,
    ),
    graphicId:
      originalDefinition.graphic_id === undefined || originalDefinition.graphic_id === null
        ? null
        : String(originalDefinition.graphic_id),
    points: normalizeNumber(originalDefinition.points),
    tiamatHealth: normalizeNumber(originalDefinition.tiamat_health),
    costs: (Array.isArray(originalDefinition.cost) ? originalDefinition.cost : [])
      .map((cost) => normalizeTrialsDifficultyCost(cost))
      .filter(Boolean),
    rewardData: normalizeJsonValue(originalDefinition.reward_data ?? []),
  }
}
