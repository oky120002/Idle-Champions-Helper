import {
  buildAgeQualifier,
  mergeHeroQualifiers,
  parseTagDisjunction,
  splitExprAtTopLevel,
  stripExprOuterParentheses,
} from './qualifierParsing.js'

function compareNumber(left, operator, right) {
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

function getHeroStatValue(hero, stat) {
  if (stat === 'total_ability_score') {
    return Object.values(hero.abilityScores ?? {}).reduce(
      (sum, value) => sum + (typeof value === 'number' ? value : 0),
      0,
    )
  }

  return hero.abilityScores[stat]
}

function isFilterLikeTarget(target) {
  if (!target || typeof target !== 'object') {
    return false
  }

  return target.type === 'by_tags'
    || target.type === 'tags'
    || target.type === 'attack_type'
    || target.type === 'stat'
    || target.type === 'stat_score'
}

function getRawFilters(effect) {
  return [
    ...(Array.isArray(effect?.filter_targets) ? effect.filter_targets : []),
    ...(Array.isArray(effect?.target_filters) ? effect.target_filters : []),
    ...(Array.isArray(effect?.target_filters_or) ? effect.target_filters_or : []),
    ...(Array.isArray(effect?.targets) ? effect.targets.filter(isFilterLikeTarget) : []),
  ]
}

function normalizeComparisonOperator(value) {
  switch (String(value ?? '').toLowerCase()) {
    case '>=':
    case 'gte':
      return '>='
    case '<=':
    case 'lte':
      return '<='
    case '>':
    case 'gt':
      return '>'
    case '<':
    case 'lt':
      return '<'
    case '=':
    case '==':
    case 'eq':
      return '=='
    default:
      return null
  }
}

export function normalizeSignalAmountFunc(value) {
  if (value === 'add' || value === 'mult') {
    return value
  }

  return value ? 'unknown' : null
}

function normalizeTargetRelation(target) {
  if (target === 'all') {
    return 'any'
  }

  if (target === 'all_slots') {
    return 'any'
  }

  if (isFilterLikeTarget(target)) {
    return 'any'
  }

  if (target && typeof target === 'object' && target.type === 'exactly_x_behind') {
    const columnsBehind = Number(target.num_columns)
    if (columnsBehind === 1) {
      return 'exactlyBehindOneColumn'
    }
    if (columnsBehind === 2) {
      return 'exactlyBehindTwoColumns'
    }
    if (columnsBehind === 3) {
      return 'exactlyBehindThreeColumns'
    }
  }

  if (target && typeof target === 'object' && target.type === 'col_num' && target.start_from_back === true) {
    const backIndex = Number(target.column)
    if (backIndex === 0) {
      return 'rearMostColumn'
    }
    if (backIndex === 1) {
      return 'secondRearMostColumn'
    }
    if (backIndex === 2) {
      return 'thirdRearMostColumn'
    }
  }

  if (target && typeof target === 'object' && target.type === 'distance') {
    const distance = Number(target.distance)
    const includeSelf = target.self === true
    const comparison = typeof target.comparison === 'string' ? target.comparison : '<='

    if ((comparison === '=' || comparison === '==') && distance === 1) {
      return includeSelf ? 'adjacentOrSelf' : 'adjacent'
    }

    if (comparison === '<=' && distance === 1) {
      return includeSelf ? 'adjacentOrSelf' : 'adjacent'
    }

    if (comparison === '<=' && distance === 2) {
      return includeSelf ? 'withinTwoSlotsOrSelf' : 'withinTwoSlots'
    }

    if (comparison === '<=' && distance === 3) {
      return includeSelf ? 'withinThreeSlotsOrSelf' : 'withinThreeSlots'
    }

    if ((comparison === '=' || comparison === '==') && distance === 2) {
      return null
    }

    if ((comparison === '=' || comparison === '==') && distance === 3) {
      return null
    }
  }

  if (target && typeof target === 'object' && target.type === 'cascade') {
    if (target.cascade_type === 'self_and_adj') {
      return 'adjacentOrSelf'
    }
    return null
  }

  if (target && typeof target === 'object' && target.type === 'col_and_back_x') {
    if (Number(target.num_back_cols) === 1) {
      return 'sameOrBehindColumn'
    }
    return null
  }

  if (target === 'self') {
    return 'self'
  }

  if (target === 'adj') {
    return 'adjacent'
  }

  if (target === 'non_adj') {
    return 'nonAdjacent'
  }

  if (target === 'col') {
    return 'sameColumn'
  }

  if (target === 'ahead') {
    return 'allAheadColumns'
  }

  if (target === 'next_col') {
    return 'aheadColumn'
  }

  if (target === 'prev_col') {
    return 'behindColumn'
  }

  if (target === 'next_two_col') {
    return 'aheadTwoColumns'
  }

  if (target === 'prev_two_col') {
    return 'behindTwoColumns'
  }

  if (target === 'behind') {
    return 'allBehindColumns'
  }

  if (target === 'col_and_prev_col') {
    return 'sameOrBehindColumn'
  }

  if (target === 'col_and_behind') {
    return 'sameOrBehindColumns'
  }

  if (target === 'col_and_ahead') {
    return 'sameOrAheadColumns'
  }

  if (target === 'prev_and_next_col') {
    return 'adjacentColumns'
  }

  if (target === 'self_and_prev_two_col') {
    return 'selfAndBehindTwoColumns'
  }

  if (target === 'self_and_adj') {
    return 'adjacentOrSelf'
  }

  if (target === 'self_and_ahead') {
    return 'sameOrAheadColumns'
  }

  if (target === 'front_2_columns') {
    return 'frontTwoColumns'
  }

  if (target === 'back_2_columns') {
    return 'backTwoColumns'
  }

  return null
}

export function normalizeExplicitTargeting(effect) {
  const rawTargets = Array.isArray(effect?.targets) ? effect.targets : []

  if (rawTargets.length === 0) {
    return { status: 'none', relation: 'any' }
  }

  const relations = rawTargets.map(normalizeTargetRelation)
  if (relations.some((relation) => relation === null)) {
    return { status: 'unsupported', note: `unsupported targets: ${JSON.stringify(rawTargets)}` }
  }

  const uniqueRelations = [...new Set(relations)]
  if (uniqueRelations.length !== 1) {
    return { status: 'unsupported', note: `mixed targets: ${JSON.stringify(rawTargets)}` }
  }

  return {
    status: 'supported',
    relation: uniqueRelations[0],
  }
}

// IC tags 字段是一个布尔表达式：| OR、^ AND、! NOT、() 分组。
// 当前 HeroQualifier 是扁平结构（requiredTags + matchMode + excludedTags），只能表达
// 简单 OR / 简单 AND / 排除；复合表达式（括号 或 |^ 混用）扁平结构表达不了，返回 null
// 让调用方降级为保守不评分。完整布尔 AST 解析见 AGENTS.md「IC 英雄谓词表达式」技术债。
function parseTagsExpression(tagsString) {
  const trimmed = tagsString.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.includes('(') || (trimmed.includes('|') && trimmed.includes('^'))) {
    return null
  }

  if (trimmed.includes('|')) {
    return {
      requiredTags: [...new Set(trimmed.split('|').map((tag) => tag.trim().toLowerCase()).filter(Boolean))],
      matchMode: 'any',
    }
  }

  if (trimmed.includes('^')) {
    const required = []
    const excluded = []
    for (const part of trimmed.split('^')) {
      const tag = part.trim()
      if (!tag) continue
      if (tag.startsWith('!')) {
        excluded.push(tag.slice(1).trim().toLowerCase())
      } else {
        required.push(tag.toLowerCase())
      }
    }
    const qualifier = {}
    if (required.length > 0) {
      qualifier.requiredTags = required
      qualifier.matchMode = 'all'
    }
    if (excluded.length > 0) {
      qualifier.excludedTags = excluded
    }
    return Object.keys(qualifier).length > 0 ? qualifier : null
  }

  if (trimmed.startsWith('!')) {
    return { excludedTags: [trimmed.slice(1).trim().toLowerCase()] }
  }

  return { requiredTags: [trimmed.toLowerCase()], matchMode: 'any' }
}

// 复合布尔表达式当前结构表达不了时，用一个不存在的 tag + matchMode all 模拟永真假，
// 让 effect 对所有英雄都不命中（保守不评分，避免错误拆分导致误匹配）。
const UNSUPPORTED_TARGET_QUALIFIER = { requiredTags: ['__ic_unsupported_target_expr__'], matchMode: 'all' }

export function normalizeTargetQualifier(effect) {
  const rawFilters = getRawFilters(effect).filter((filter) => filter && typeof filter === 'object')
  const tagFilterStrings = rawFilters
    .filter((filter) => filter.type === 'by_tags' || filter.type === 'tags')
    .map((filter) => filter.tags)
    .filter((tags) => typeof tags === 'string' && tags.length > 0)
  const attackTypeFilters = rawFilters
    .filter((filter) => filter.type === 'attack_type')
    .map((filter) => (typeof filter.attack === 'string' ? filter.attack.toLowerCase().trim() : null))
    .filter(Boolean)

  if (tagFilterStrings.length === 0 && attackTypeFilters.length === 0) {
    return null
  }

  // 多个 tag filter 间为 AND；单个 filter 内 |/^/! 由 parseTagsExpression 解析。
  // 任一 filter 解析失败（复合表达式）→ 整体降级为保守不评分。
  let tagQualifier = null
  for (const tagsString of tagFilterStrings) {
    const parsed = parseTagsExpression(tagsString)
    if (!parsed) {
      tagQualifier = UNSUPPORTED_TARGET_QUALIFIER
      break
    }
    tagQualifier = tagQualifier ? mergeHeroQualifiers(tagQualifier, parsed) : parsed
    if (!tagQualifier) {
      tagQualifier = UNSUPPORTED_TARGET_QUALIFIER
      break
    }
  }

  return {
    ...((tagQualifier?.requiredTags?.length ?? 0) > 0
      ? { requiredTags: tagQualifier.requiredTags, matchMode: tagQualifier.matchMode ?? 'any' }
      : {}),
    ...((tagQualifier?.excludedTags?.length ?? 0) > 0
      ? { excludedTags: tagQualifier.excludedTags }
      : {}),
    ...(attackTypeFilters.length > 0
      ? { requiredAttackDamageTypes: [...new Set(attackTypeFilters)] }
      : {}),
  }
}

export function normalizeStatQualifiers(effect) {
  const qualifiers = getRawFilters(effect)
    .filter((filter) => filter && typeof filter === 'object')
    .filter((filter) => filter.type === 'stat' || filter.type === 'stat_score')
    .map((filter) => {
      const stat = typeof filter.stat === 'string' ? filter.stat.toLowerCase() : null
      const operator = normalizeComparisonOperator(
        typeof filter.check === 'string'
          ? filter.check
          : typeof filter.comparison === 'string'
            ? filter.comparison
            : '>=',
      )
      const rawValue = typeof filter.score === 'number'
        ? filter.score
        : typeof filter.check === 'number'
          ? filter.check
          : typeof filter.value === 'number'
            ? filter.value
          : null

      if (!stat || rawValue === null || !operator) {
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

export function parsePerHeroExpr(expr) {
  if (typeof expr !== 'string') {
    return null
  }

  const trimmed = stripExprOuterParentheses(expr.trim())
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

  const tagQualifier = parseTagDisjunction(trimmed)
  if (tagQualifier) {
    return tagQualifier
  }

  if (asIntMatch) {
    return parsePerHeroExpr(asIntMatch[1])
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
    return buildAgeQualifier(
      ageWithExcludeMatch[1],
      Number(ageWithExcludeMatch[2]),
      ageWithExcludeMatch[3],
    )
  }

  if (ageMatch) {
    return buildAgeQualifier(ageMatch[1], Number(ageMatch[2]))
  }

  const andClauses = splitExprAtTopLevel(trimmed, '&&')
  if (andClauses.length > 1) {
    return andClauses.reduce((mergedQualifier, clause) => {
      if (mergedQualifier === null) {
        return null
      }

      const clauseQualifier = parsePerHeroExpr(clause)
      if (!clauseQualifier) {
        return null
      }

      return mergeHeroQualifiers(mergedQualifier, clauseQualifier)
    }, {})
  }

  return null
}

export function attachSignalSemantics(signal, effect) {
  const tagQualifier = normalizeTargetQualifier(effect)
  const statQualifiers = normalizeStatQualifiers(effect)
  const perHeroQualifier = parsePerHeroExpr(effect?.per_hero_expr)
  const explicitTargeting = normalizeExplicitTargeting(effect)
  const heroQualifierFromFilters = (tagQualifier || statQualifiers)
    ? {
        ...(tagQualifier ?? {}),
        ...(statQualifiers ? { requiredStats: statQualifiers } : {}),
      }
    : null
  const useFormationCountQualifier = typeof effect?.stack_func === 'string' && effect.stack_func !== 'per_upgrade_targets'
  const keepTargetQualifier = effect?.stack_func === 'per_upgrade_targets'

  return {
    ...signal,
    targetQualifier:
      signal.targetQualifier
      ?? (keepTargetQualifier
        ? heroQualifierFromFilters
        : useFormationCountQualifier
          ? null
          : heroQualifierFromFilters),
    formationCountQualifier:
      signal.formationCountQualifier
      ?? perHeroQualifier
      ?? (useFormationCountQualifier || keepTargetQualifier ? heroQualifierFromFilters : null),
    positionQualifier:
      signal.positionQualifier
      ?? (explicitTargeting.status === 'supported' && explicitTargeting.relation !== 'any'
        ? { relation: explicitTargeting.relation }
        : null),
    formationCountPositionQualifier: signal.formationCountPositionQualifier ?? null,
    amountFunc: signal.amountFunc ?? normalizeSignalAmountFunc(effect?.amount_func),
    stackFunc: signal.stackFunc ?? (typeof effect?.stack_func === 'string' ? effect.stack_func : null),
    applyManually: effect?.apply_manually === true,
    stacksMultiply: typeof effect?.stacks_multiply === 'boolean' ? effect.stacks_multiply : null,
    excludeSelf: effect?.exclude_self === true,
  }
}

export function matchesHeroQualifier(hero, qualifier) {
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
    const heroValue = getHeroStatValue(hero, statQualifier.stat)
    if (!compareNumber(heroValue, statQualifier.operator, statQualifier.value)) {
      return false
    }
  }

  if (qualifier.requiredBaseAttackCooldown) {
    if (!compareNumber(
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
    if (!compareNumber(hero.age, qualifier.minAgeOperator ?? '>=', qualifier.minAge)) {
      return false
    }
  }

  if (qualifier.maxAge !== null && qualifier.maxAge !== undefined) {
    if (!compareNumber(hero.age, qualifier.maxAgeOperator ?? '<=', qualifier.maxAge)) {
      return false
    }
  }

  if ((qualifier.excludedHeroIds ?? []).includes(hero.heroId)) {
    return false
  }

  return true
}
