function toText(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

function normalizeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const text = toText(value)
  if (!text) {
    return null
  }

  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeLocalizedText(originalValue, displayValue, fallbackValue = '') {
  const fallback = toText(fallbackValue) ?? ''
  const original = toText(originalValue) ?? toText(displayValue) ?? fallback
  const display = toText(displayValue) ?? original

  if (!original || !display) {
    return null
  }

  return { original, display }
}

function compareLocalizedText(left, right) {
  return left.display.localeCompare(right.display) || left.original.localeCompare(right.original)
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
