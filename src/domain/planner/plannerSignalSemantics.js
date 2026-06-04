import {
  buildPlannerAgeQualifier,
  mergePlannerHeroQualifiers,
  parsePlannerTagDisjunction,
  splitPlannerExprAtTopLevel,
  stripPlannerExprOuterParentheses,
} from './plannerQualifierParsing.js'

function comparePlannerNumber(left, operator, right) {
  if (typeof left !== 'number') {
    return false
  }

  switch (operator) {
    case '>=':
      return left >= right
    case '<=':
      return left <= right
    case '>':
      return left > right
    case '<':
      return left < right
    case '==':
      return left === right
    default:
      return false
  }
}

function getPlannerHeroStatValue(hero, stat) {
  if (stat === 'total_ability_score') {
    return Object.values(hero.abilityScores ?? {}).reduce(
      (sum, value) => sum + (typeof value === 'number' ? value : 0),
      0,
    )
  }

  return hero.abilityScores[stat]
}

function getPlannerRawFilters(effect) {
  return [
    ...(Array.isArray(effect?.filter_targets) ? effect.filter_targets : []),
    ...(Array.isArray(effect?.target_filters) ? effect.target_filters : []),
  ]
}

export function normalizePlannerSignalAmountFunc(value) {
  if (value === 'add' || value === 'mult') {
    return value
  }

  return value ? 'unknown' : null
}

export function normalizePlannerTargetQualifier(effect) {
  const tagFilters = getPlannerRawFilters(effect)
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

export function normalizePlannerStatQualifiers(effect) {
  const qualifiers = getPlannerRawFilters(effect)
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

export function parsePlannerPerHeroExpr(expr) {
  if (typeof expr !== 'string') {
    return null
  }

  const trimmed = stripPlannerExprOuterParentheses(expr.trim())
  if (!trimmed || trimmed === 'true') {
    return {}
  }

  if (trimmed === '0') {
    return null
  }

  if (trimmed === 'is_undead') {
    return {
      requiredTags: ['undead'],
      matchMode: 'any',
    }
  }

  const attackDamageTypeMatch = trimmed.match(/^HasAttackDamageType\(`([^`]+)`\)$/)
  const excludedAttackDamageTypeMatch = trimmed.match(/^!HasAttackDamageType\(`([^`]+)`\)$/)
  const negatedTagMatch = trimmed.match(/^!HasTag\(`([^`]+)`\)$/)
  const asIntMatch = trimmed.match(/^as_int\((.+)\)$/)
  const statMatch = trimmed.match(/^GetStat\(`([A-Za-z_]+)`\)\s*(>=|<=|>|<|==)\s*(\d+)$/)
  const baseAttackCooldownMatch = trimmed.match(/^base_attack_cooldown\s*(>=|<=|>|<|==)\s*(\d+(?:\.\d+)?)$/)
  const ageMatch = trimmed.match(/^age\s*(>=|<=|>|<|==)\s*(\d+)$/)
  const ageWithExcludeMatch = trimmed.match(/^age\s*(>=|<=|>|<|==)\s*(\d+)\s*&&\s*hero_id\s*!=\s*([0-9]+)$/)

  if (attackDamageTypeMatch) {
    return {
      requiredAttackDamageTypes: [attackDamageTypeMatch[1].toLowerCase()],
    }
  }

  if (excludedAttackDamageTypeMatch) {
    return {
      excludedAttackDamageTypes: [excludedAttackDamageTypeMatch[1].toLowerCase()],
    }
  }

  if (negatedTagMatch) {
    return {
      excludedTags: [negatedTagMatch[1]],
    }
  }

  const tagQualifier = parsePlannerTagDisjunction(trimmed)
  if (tagQualifier) {
    return tagQualifier
  }

  if (asIntMatch) {
    return parsePlannerPerHeroExpr(asIntMatch[1])
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

  if (baseAttackCooldownMatch) {
    return {
      requiredBaseAttackCooldown: {
        operator: baseAttackCooldownMatch[1],
        value: Number(baseAttackCooldownMatch[2]),
      },
    }
  }

  if (ageWithExcludeMatch) {
    return buildPlannerAgeQualifier(
      ageWithExcludeMatch[1],
      Number(ageWithExcludeMatch[2]),
      ageWithExcludeMatch[3],
    )
  }

  if (ageMatch) {
    return buildPlannerAgeQualifier(ageMatch[1], Number(ageMatch[2]))
  }

  const andClauses = splitPlannerExprAtTopLevel(trimmed, '&&')
  if (andClauses.length > 1) {
    return andClauses.reduce((mergedQualifier, clause) => {
      if (mergedQualifier === null) {
        return null
      }

      const clauseQualifier = parsePlannerPerHeroExpr(clause)
      if (!clauseQualifier) {
        return null
      }

      return mergePlannerHeroQualifiers(mergedQualifier, clauseQualifier)
    }, {})
  }

  return null
}

export function attachPlannerSignalSemantics(signal, effect) {
  const tagQualifier = normalizePlannerTargetQualifier(effect)
  const statQualifiers = normalizePlannerStatQualifiers(effect)
  const perHeroQualifier = parsePlannerPerHeroExpr(effect?.per_hero_expr)
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
    amountFunc: normalizePlannerSignalAmountFunc(effect?.amount_func),
    stackFunc: typeof effect?.stack_func === 'string' ? effect.stack_func : null,
    applyManually: effect?.apply_manually === true,
    stacksMultiply: typeof effect?.stacks_multiply === 'boolean' ? effect.stacks_multiply : null,
    excludeSelf: effect?.exclude_self === true,
  }
}

export function matchesPlannerHeroQualifier(hero, qualifier) {
  if (!qualifier) {
    return true
  }

  const requiredTags = qualifier.requiredTags ?? []
  const heroTags = new Set(hero.tags.map((tag) => tag.toLowerCase()))
  if (requiredTags.length > 0) {
    const normalizedTags = requiredTags.map((tag) => tag.toLowerCase())
    const matchMode = qualifier.matchMode ?? 'any'
    const tagMatches = matchMode === 'all'
      ? normalizedTags.every((tag) => heroTags.has(tag))
      : normalizedTags.some((tag) => heroTags.has(tag))

    if (!tagMatches) {
      return false
    }
  }

  const excludedTags = qualifier.excludedTags ?? []
  if (excludedTags.length > 0) {
    const hasExcludedTag = excludedTags
      .map((tag) => tag.toLowerCase())
      .some((tag) => heroTags.has(tag))

    if (hasExcludedTag) {
      return false
    }
  }

  for (const statQualifier of qualifier.requiredStats ?? []) {
    const heroValue = getPlannerHeroStatValue(hero, statQualifier.stat)
    if (!comparePlannerNumber(heroValue, statQualifier.operator, statQualifier.value)) {
      return false
    }
  }

  if (qualifier.requiredBaseAttackCooldown) {
    if (!comparePlannerNumber(
      hero.baseAttackCooldown,
      qualifier.requiredBaseAttackCooldown.operator,
      qualifier.requiredBaseAttackCooldown.value,
    )) {
      return false
    }
  }

  const heroAttackDamageTypes = new Set((hero.baseAttackDamageTypes ?? []).map((value) => value.toLowerCase()))
  const requiredAttackDamageTypes = qualifier.requiredAttackDamageTypes ?? []
  if (requiredAttackDamageTypes.length > 0) {
    const matchesRequiredAttackDamageType = requiredAttackDamageTypes
      .map((value) => value.toLowerCase())
      .some((value) => heroAttackDamageTypes.has(value))

    if (!matchesRequiredAttackDamageType) {
      return false
    }
  }

  const excludedAttackDamageTypes = qualifier.excludedAttackDamageTypes ?? []
  if (excludedAttackDamageTypes.length > 0) {
    const matchesExcludedAttackDamageType = excludedAttackDamageTypes
      .map((value) => value.toLowerCase())
      .some((value) => heroAttackDamageTypes.has(value))

    if (matchesExcludedAttackDamageType) {
      return false
    }
  }

  if (qualifier.minAge !== null && qualifier.minAge !== undefined) {
    if (!comparePlannerNumber(hero.age, qualifier.minAgeOperator ?? '>=', qualifier.minAge)) {
      return false
    }
  }

  if (qualifier.maxAge !== null && qualifier.maxAge !== undefined) {
    if (!comparePlannerNumber(hero.age, qualifier.maxAgeOperator ?? '<=', qualifier.maxAge)) {
      return false
    }
  }

  if ((qualifier.excludedHeroIds ?? []).includes(hero.heroId)) {
    return false
  }

  return true
}
