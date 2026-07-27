import type {
  HeroAbilitySignal,
  HeroComparisonOperator,
  HeroPredicateAST,
  HeroQualifier,
  HeroStatKey,
  HeroStatQualifier,
  ResolvedHeroAbilityProfile,
} from './abilityModel'
import { evalHeroPredicate, parseHeroPredicate } from './heroPredicate.ts'
import { isFilterLikeTarget, isUnknownArray, normalizeExplicitTargeting } from './heroTargetingRelation'

export { normalizeExplicitTargeting }
export type { HeroExplicitTargeting } from './heroTargetingRelation'

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
// 避免 wrapper 层 targeting 丢失。
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

// stack_func_data.tag = 堆叠计数限定（count 哪些英雄叠层），与 filter_targets（buff 目标限定）语义不同。
// 真实样本：蔚 ed=1644 善良榜样 stack_func_data:{tag:"good|acqinc|cteam"}（count）+
// filter_targets:[{by_tags:geneutral}]（target），二者并存且不同。
// 仅处理 tag 形态（formation-count-mult-stack 机制）；非 tag 形态（upgrade_id/unique_alignment 等）
// 属其它机制，保持原状不动，避免回归。
function readStackFuncDataTag(stackFuncData: unknown): string | null {
  if (stackFuncData && typeof stackFuncData === 'object') {
    const tag = (stackFuncData as Record<string, unknown>).tag
    if (typeof tag === 'string') return tag
  }
  return null
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

  // stack_func_data.tag 解析为 count 限定（多 tag "a|b|c" → OR，与 IC tags 同 shorthand 方言）。
  const stackFuncDataTag = readStackFuncDataTag(e.stack_func_data)
  const stackFuncDataPredicate = stackFuncDataTag ? parseHeroPredicate(stackFuncDataTag, 'shorthand') : null
  const stackFuncDataQualifier = stackFuncDataPredicate ? { predicate: stackFuncDataPredicate } : null

  // 有显式 count 限定来源（per_hero_expr 或 stack_func_data.tag）时，filter_targets 回归 target 语义；
  // 否则保留旧行为（stack_func 场景 filter_targets 当 count，per_upgrade_targets 当 target）。
  const hasExplicitCountQualifier = stackFuncDataQualifier !== null || perHeroQualifier !== null

  return {
    ...signal,
    targetQualifier:
      signal.targetQualifier
      ?? (hasExplicitCountQualifier
        ? filterQualifier
        : keepTargetQualifier
          ? filterQualifier
          : useFormationCountQualifier
            ? null
            : filterQualifier),
    formationCountQualifier:
      signal.formationCountQualifier
      ?? perHeroQualifier
      ?? stackFuncDataQualifier
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
