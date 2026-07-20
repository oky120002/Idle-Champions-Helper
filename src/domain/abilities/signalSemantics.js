import { evalHeroPredicate, parseHeroPredicate } from './heroPredicate.js'

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
// effect 的 by_tags/tags/stat/attack_type filter 统一解析为 HeroQualifier.predicate。
// tags 用 parseHeroPredicate('shorthand')，支持括号 / |^ 混用复合表达式精确求值；
// 多 filter 间 AND。
export function normalizeTargetQualifier(effect) {
  const rawFilters = getRawFilters(effect).filter((filter) => filter && typeof filter === 'object')

  const tagAsts = rawFilters
    .filter((filter) => (filter.type === 'by_tags' || filter.type === 'tags') && typeof filter.tags === 'string' && filter.tags.length > 0)
    .map((filter) => parseHeroPredicate(filter.tags, 'shorthand'))
    .filter((node) => node !== null)

  const statAsts = statQualifiersToNodes(normalizeStatQualifiers(effect))

  const attackTypeAsts = rawFilters
    .filter((filter) => filter.type === 'attack_type' && typeof filter.attack === 'string')
    .map((filter) => ({ op: 'attackType', attackType: filter.attack.toLowerCase().trim(), negate: false }))

  const children = [...tagAsts, ...statAsts, ...attackTypeAsts]
  if (children.length === 0) {
    return null
  }
  // 同结构节点去重（多个等价 filter 合并为一个，避免冗余 and）。
  const uniqueChildren = [...new Map(children.map((node) => [JSON.stringify(node), node])).values()]
  return { predicate: uniqueChildren.length === 1 ? uniqueChildren[0] : { op: 'and', children: uniqueChildren } }
}

// HeroStatQualifier[] → stat AST 节点。normalizeTargetQualifier 与 effect-helpers 复用。
export function statQualifiersToNodes(statQualifiers) {
  if (!statQualifiers) {
    return []
  }
  return statQualifiers.map((statQualifier) => ({
    op: 'stat',
    stat: statQualifier.stat,
    operator: statQualifier.operator,
    value: statQualifier.value,
  }))
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

// per_hero_expr 布尔谓词（functional 语法）解析为 HeroPredicateAST。
// 数值表达式（min/max/floor/GetUpgradeAmount/levels_past_softcap）返回 number 非 boolean，
// 返回 null（归 stage 7 stack 计算）。
export function parsePerHeroExpr(expr) {
  return parseHeroPredicate(expr, 'functional')
}

export function attachSignalSemantics(signal, effect) {
  // tag/stat/attack filter 统一经 normalizeTargetQualifier 解析为 { predicate }。
  const filterQualifier = normalizeTargetQualifier(effect)
  const perHeroPredicate = parsePerHeroExpr(effect?.per_hero_expr)
  const perHeroQualifier = perHeroPredicate ? { predicate: perHeroPredicate } : null
  const explicitTargeting = normalizeExplicitTargeting(effect)
  const useFormationCountQualifier = typeof effect?.stack_func === 'string' && effect.stack_func !== 'per_upgrade_targets'
  const keepTargetQualifier = effect?.stack_func === 'per_upgrade_targets'

  return {
    ...signal,
    targetQualifier:
      signal.targetQualifier
      ?? (keepTargetQualifier
        ? filterQualifier
        : useFormationCountQualifier
          ? null
          : filterQualifier),
    formationCountQualifier:
      signal.formationCountQualifier
      ?? perHeroQualifier
      ?? (useFormationCountQualifier || keepTargetQualifier ? filterQualifier : null),
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
  return evalHeroPredicate(qualifier.predicate, hero)
}
