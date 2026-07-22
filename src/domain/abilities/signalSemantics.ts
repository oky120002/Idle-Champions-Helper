import type {
  HeroAbilitySignal,
  HeroComparisonOperator,
  HeroPredicateAST,
  HeroQualifier,
  HeroPositionRelation,
  HeroStatKey,
  HeroStatQualifier,
  ResolvedHeroAbilityProfile,
} from './abilityModel'
import { evalHeroPredicate, parseHeroPredicate } from './heroPredicate.ts'

export interface HeroExplicitTargetingNone {
  status: 'none'
  relation: 'any'
}

export interface HeroExplicitTargetingSupported {
  status: 'supported'
  relation: HeroPositionRelation
}

export interface HeroExplicitTargetingUnsupported {
  status: 'unsupported'
  note: string
}

export type HeroExplicitTargeting =
  | HeroExplicitTargetingNone
  | HeroExplicitTargetingSupported
  | HeroExplicitTargetingUnsupported

function isFilterLikeTarget(target: unknown): boolean {
  if (!target || typeof target !== 'object') {
    return false
  }

  const type = (target as Record<string, unknown>).type
  return type === 'by_tags'
    || type === 'tags'
    || type === 'attack_type'
    || type === 'stat'
    || type === 'stat_score'
}

// Array.isArray 对 unknown narrow 成 any[]（触发 no-unsafe-assignment），统一用谓词收窄到 unknown[]。
function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

// 单一来源：effect 上所有 filter-like 结构（filter_targets / target_filters /
// target_filters_or / targets 中 filter-like 对象）。signal-coverage 等脚本复用，
// 禁止另起副本——曾因副本漂移漏读 target_filters_or 与 targets 导致覆盖率失真。
export function getRawFilters(effect: unknown): unknown[] {
  if (!effect || typeof effect !== 'object') {
    return []
  }
  const e = effect as Record<string, unknown>
  const filterTargets = e.filter_targets
  const targetFilters = e.target_filters
  const targetFiltersOr = e.target_filters_or
  const targets = e.targets
  return [
    ...(isUnknownArray(filterTargets) ? filterTargets : []),
    ...(isUnknownArray(targetFilters) ? targetFilters : []),
    ...(isUnknownArray(targetFiltersOr) ? targetFiltersOr : []),
    ...(isUnknownArray(targets) ? targets.filter(isFilterLikeTarget) : []),
  ]
}

function normalizeComparisonOperator(value: unknown): HeroComparisonOperator | null {
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  switch (raw.toLowerCase()) {
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

export function normalizeSignalAmountFunc(value: unknown): 'add' | 'mult' | 'unknown' | null {
  if (value === 'add' || value === 'mult') {
    return value
  }

  return value ? 'unknown' : null
}

// 字符串 target → 位置关系（IC effect_defines.targets 的字符串简写）
const STRING_RELATION_MAP: Record<string, HeroPositionRelation> = {
  self: 'self',
  adj: 'adjacent',
  non_adj: 'nonAdjacent',
  col: 'sameColumn',
  ahead: 'allAheadColumns',
  next_col: 'aheadColumn',
  prev_col: 'behindColumn',
  next_two_col: 'aheadTwoColumns',
  prev_two_col: 'behindTwoColumns',
  behind: 'allBehindColumns',
  col_and_prev_col: 'sameOrBehindColumn',
  col_and_behind: 'sameOrBehindColumns',
  col_and_ahead: 'sameOrAheadColumns',
  prev_and_next_col: 'adjacentColumns',
  self_and_prev_two_col: 'selfAndBehindTwoColumns',
  self_and_adj: 'adjacentOrSelf',
  self_and_ahead: 'sameOrAheadColumns',
  front_2_columns: 'frontTwoColumns',
  back_2_columns: 'backTwoColumns',
}

const EXACTLY_BEHIND_COLUMNS: Record<number, HeroPositionRelation> = {
  1: 'exactlyBehindOneColumn',
  2: 'exactlyBehindTwoColumns',
  3: 'exactlyBehindThreeColumns',
}

const COL_FROM_BACK_INDEX: Record<number, HeroPositionRelation> = {
  0: 'rearMostColumn',
  1: 'secondRearMostColumn',
  2: 'thirdRearMostColumn',
}

// distance target：comparison + distance + self 组合 → 位置关系
function resolveDistanceRelation(target: Record<string, unknown>): HeroPositionRelation | null {
  const distance = Number(target.distance)
  const includeSelf = target.self === true
  const comparison = typeof target.comparison === 'string' ? target.comparison : '<='
  const exact = comparison === '=' || comparison === '=='

  // distance=1：exact 或 <= 都映射 adjacent（含 self 变体）
  if (distance === 1 && (exact || comparison === '<=')) {
    return includeSelf ? 'adjacentOrSelf' : 'adjacent'
  }
  if (comparison === '<=' && distance === 2) {
    return includeSelf ? 'withinTwoSlotsOrSelf' : 'withinTwoSlots'
  }
  if (comparison === '<=' && distance === 3) {
    return includeSelf ? 'withinThreeSlotsOrSelf' : 'withinThreeSlots'
  }
  // distance=2/3 的 exact 无对应枚举
  return null
}

function normalizeObjectRelation(target: Record<string, unknown>): HeroPositionRelation | null {
  switch (target.type) {
    case 'exactly_x_behind':
      return EXACTLY_BEHIND_COLUMNS[Number(target.num_columns)] ?? null
    case 'col_num':
      return target.start_from_back === true
        ? (COL_FROM_BACK_INDEX[Number(target.column)] ?? null)
        : null
    case 'distance':
      return resolveDistanceRelation(target)
    case 'cascade':
      return target.cascade_type === 'self_and_adj' ? 'adjacentOrSelf' : null
    case 'col_and_back_x':
      return Number(target.num_back_cols) === 1 ? 'sameOrBehindColumn' : null
    default:
      return null
  }
}

function normalizeTargetRelation(target: unknown): HeroPositionRelation | null {
  if (target === 'all' || target === 'all_slots' || isFilterLikeTarget(target)) {
    return 'any'
  }
  if (typeof target === 'string') {
    return STRING_RELATION_MAP[target] ?? null
  }
  if (target && typeof target === 'object') {
    return normalizeObjectRelation(target as Record<string, unknown>)
  }
  return null
}

export function normalizeExplicitTargeting(effect: unknown): HeroExplicitTargeting {
  const targetsField = (effect && typeof effect === 'object') ? (effect as Record<string, unknown>).targets : undefined
  const rawTargets: unknown[] = isUnknownArray(targetsField) ? targetsField : []

  if (rawTargets.length === 0) {
    return { status: 'none', relation: 'any' }
  }

  const relations = (rawTargets).map(normalizeTargetRelation)
  if (relations.some((relation) => relation === null)) {
    return { status: 'unsupported', note: `unsupported targets: ${JSON.stringify(rawTargets)}` }
  }

  const validRelations = relations.filter((r): r is HeroPositionRelation => r !== null)
  const uniqueRelations = [...new Set(validRelations)]
  if (uniqueRelations.length !== 1) {
    return { status: 'unsupported', note: `mixed targets: ${JSON.stringify(rawTargets)}` }
  }

  return {
    status: 'supported',
    relation: uniqueRelations[0]!,
  }
}

// hero_ids / exclude_heroes 的英雄 id 列表 → HeroPredicateAST。
// 白名单（hero_ids）→ heroId 或 OR(heroId)；黑名单（exclude_heroes）→ NOT(...)。
// 节点结构与 per_hero_expr 的 hero_id==N 一致（evalNode 按 String(hero.heroId) 比较）。
function heroIdsToPredicate(heroIds: unknown, negate: boolean): HeroPredicateAST | null {
  const nodes: HeroPredicateAST[] = []
  for (const id of isUnknownArray(heroIds) ? heroIds : []) {
    if (typeof id === 'number' || typeof id === 'string') {
      nodes.push({ op: 'heroId', heroId: String(id), negate: false })
    }
  }
  if (nodes.length === 0) {
    return null
  }
  const inner: HeroPredicateAST = nodes.length === 1 ? nodes[0]! : { op: 'or', children: nodes }
  return negate ? { op: 'not', child: inner } : inner
}

// 合并两个 HeroQualifier（AND 语义）：null 取另一个，同结构去重。
// buff_upgrade wrapper 派生时合并 base 的 targetQualifier 与 wrapper 自身 filter_targets，
// 避免 wrapper 层 targeting 丢失（第四轮审计：hero 82 buff_upgrades + hero_ids）。
export function mergeHeroQualifiers(
  left: HeroQualifier | null,
  right: HeroQualifier | null,
): HeroQualifier | null {
  if (!left) {
    return right ?? null
  }
  if (!right) {
    return left
  }
  if (JSON.stringify(left.predicate) === JSON.stringify(right.predicate)) {
    return left
  }
  return { predicate: { op: 'and', children: [left.predicate, right.predicate] } }
}

// IC tags 字段是一个布尔表达式：| OR、^ AND、! NOT、() 分组。
// effect 的 by_tags/tags/hero_expr/hero_ids/exclude_heroes/stat/attack_type filter 统一解析为 HeroQualifier.predicate。
// tags 用 parseHeroPredicate('shorthand')，hero_expr 用 parseHeroPredicate('functional')
//（与 per_hero_expr 同方言），支持括号 / 复合表达式精确求值；多 filter 间 AND。
export function normalizeTargetQualifier(effect: unknown): HeroQualifier | null {
  const rawFilters = getRawFilters(effect).filter((filter) => filter && typeof filter === 'object')

  const tagAsts = rawFilters
    .filter((filter) => {
      const f = filter as Record<string, unknown>
      return (f.type === 'by_tags' || f.type === 'tags') && typeof f.tags === 'string' && (f.tags).length > 0
    })
    .map((filter) => parseHeroPredicate((filter as Record<string, unknown>).tags, 'shorthand'))
    .filter((node): node is HeroPredicateAST => node !== null)

  // hero_expr filter（functional 谓词）：限定 effect 目标英雄，语义同 per_hero_expr。
  // 真实样本：Diana/Sheila/Baldric 的 hero_dps_multiplier_mult 用 hero_expr 限定 DEX/tag/race。
  // 不可解析（GetUpgradeUnlocked 等运行时叶子）→ null → 保守丢弃该 filter。
  const heroExprAsts = rawFilters
    .filter((filter) => {
      const f = filter as Record<string, unknown>
      return f.type === 'hero_expr' && typeof f.hero_expr === 'string' && (f.hero_expr).length > 0
    })
    .map((filter) => parseHeroPredicate((filter as Record<string, unknown>).hero_expr, 'functional'))
    .filter((node): node is HeroPredicateAST => node !== null)

  // hero_ids / exclude_heroes filter：按英雄 id 白名单/黑名单限定 effect 目标。
  // 真实样本：effect_def 134（adj + hero_id=24 恩拉克 +400%）、163（adj + hero_id=27 宾温 +400%）。
  // 复用 heroId AST 节点（与 per_hero_expr 的 hero_id==N 同节点），多 id → OR，exclude → NOT。
  const heroIdAsts = rawFilters
    .filter((filter) => (filter as Record<string, unknown>).type === 'hero_ids')
    .map((filter) => heroIdsToPredicate((filter as Record<string, unknown>).hero_ids, false))
    .filter((node): node is HeroPredicateAST => node !== null)

  const excludeHeroAsts = rawFilters
    .filter((filter) => (filter as Record<string, unknown>).type === 'exclude_heroes')
    .map((filter) => heroIdsToPredicate((filter as Record<string, unknown>).hero_ids, true))
    .filter((node): node is HeroPredicateAST => node !== null)

  const statAsts = statQualifiersToNodes(normalizeStatQualifiers(effect))

  const attackTypeAsts: HeroPredicateAST[] = rawFilters
    .filter((filter) => {
      const f = filter as Record<string, unknown>
      return f.type === 'attack_type' && typeof f.attack === 'string'
    })
    .map((filter) => ({ op: 'attackType', attackType: ((filter as Record<string, unknown>).attack as string).toLowerCase().trim(), negate: false }))

  const children: HeroPredicateAST[] = [...tagAsts, ...heroExprAsts, ...heroIdAsts, ...excludeHeroAsts, ...statAsts, ...attackTypeAsts]
  if (children.length === 0) {
    return null
  }
  // 同结构节点去重（多个等价 filter 合并为一个，避免冗余 and）。
  const uniqueChildren = [...new Map(children.map((node) => [JSON.stringify(node), node] as const)).values()]
  return { predicate: uniqueChildren.length === 1 ? uniqueChildren[0]! : { op: 'and', children: uniqueChildren } }
}

// HeroStatQualifier[] → stat AST 节点。normalizeTargetQualifier 与 effect-helpers 复用。
export function statQualifiersToNodes(statQualifiers: HeroStatQualifier[] | null): HeroPredicateAST[] {
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

export function normalizeStatQualifiers(effect: unknown): HeroStatQualifier[] | null {
  const qualifiers = getRawFilters(effect)
    .filter((filter) => filter && typeof filter === 'object')
    .map((filter) => {
      const f = filter as Record<string, unknown>
      const stat = typeof f.stat === 'string' ? (f.stat).toLowerCase() : null
      const operator = normalizeComparisonOperator(
        typeof f.check === 'string'
          ? f.check
          : typeof f.comparison === 'string'
            ? f.comparison
            : '>=',
      )
      const rawValue = typeof f.score === 'number'
        ? f.score
        : typeof f.check === 'number'
          ? f.check
          : typeof f.value === 'number'
            ? f.value
          : null

      if (!stat || rawValue === null || !operator) {
        return null
      }

      return {
        stat: stat as HeroStatKey,
        operator,
        value: rawValue,
      }
    })
    .filter((q): q is HeroStatQualifier => q !== null)

  return qualifiers.length > 0 ? qualifiers : null
}

// per_hero_expr 布尔谓词（functional 语法）解析为 HeroPredicateAST。
// 数值表达式（min/max/floor/GetUpgradeAmount/levels_past_softcap）返回 number 非 boolean，
// 返回 null（归 stage 7 stack 计算）。
export function parsePerHeroExpr(expr: unknown): HeroPredicateAST | null {
  return parseHeroPredicate(expr, 'functional')
}

export function attachSignalSemantics(signal: HeroAbilitySignal, effect: unknown): HeroAbilitySignal {
  const e: Record<string, unknown> = (effect && typeof effect === 'object') ? effect as Record<string, unknown> : {}
  // tag/stat/attack filter 统一经 normalizeTargetQualifier 解析为 { predicate }。
  const filterQualifier = normalizeTargetQualifier(effect)
  const perHeroPredicate = parsePerHeroExpr(e.per_hero_expr)
  const perHeroQualifier = perHeroPredicate ? { predicate: perHeroPredicate } : null
  const explicitTargeting = normalizeExplicitTargeting(effect)
  const stackFuncRaw = e.stack_func
  const useFormationCountQualifier = typeof stackFuncRaw === 'string' && stackFuncRaw !== 'per_upgrade_targets'
  const keepTargetQualifier = stackFuncRaw === 'per_upgrade_targets'

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
    amountFunc: signal.amountFunc ?? normalizeSignalAmountFunc(e.amount_func),
    stackFunc: signal.stackFunc ?? (typeof stackFuncRaw === 'string' ? stackFuncRaw : null),
    applyManually: e.apply_manually === true,
    stacksMultiply: typeof e.stacks_multiply === 'boolean' ? e.stacks_multiply : null,
    excludeSelf: e.exclude_self === true,
  }
}

export function matchesHeroQualifier(
  hero: ResolvedHeroAbilityProfile,
  qualifier: HeroQualifier | null | undefined,
): boolean {
  if (!qualifier) {
    return true
  }
  return evalHeroPredicate(qualifier.predicate, hero)
}
