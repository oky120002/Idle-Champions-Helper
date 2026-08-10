import type {
  HeroAbilityAmountFunc,
  HeroAbilitySignal,
  HeroComparisonOperator,
  HeroPredicateAST,
  HeroQualifier,
  HeroStatKey,
  HeroStatQualifier,
  ResolvedHeroAbilityProfile,
} from './abilityModel'
import { POOL_SCOPE_BY_KIND } from './poolScope'
import { evalHeroPredicate, parseHeroPredicate } from './heroPredicate.ts'
import { isFilterLikeTarget, isUnknownArray, normalizeExplicitTargeting } from './heroTargetingRelation'

export { normalizeExplicitTargeting }
export type { HeroExplicitTargeting } from './heroTargetingRelation'

// 单一来源：effect 上所有 filter-like 结构（filter_targets / target_filters /
// target_filters_or / targets 中 filter-like 对象）。signal-coverage 等脚本复用，
// 禁止另起副本——曾因副本漂移漏读 target_filters_or 与 targets 导致覆盖率失真。
export function getRawFilters(effect: unknown): unknown[] {
  if (effect == null || typeof effect !== 'object') {
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

export function normalizeSignalAmountFunc(value: unknown): HeroAbilityAmountFunc | null {
  if (value === 'add' || value === 'mult') {
    return value
  }

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- unknown 真值判断：amount_func 来自 JSON 可能是任意类型，需完整 truthy 语义（0/''/false/NaN → null，其余 → 'unknown'）；explicit 比较无法等价覆盖 NaN 的 falsy 行为
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
  const first = nodes[0]
  const inner: HeroPredicateAST = nodes.length === 1 && first !== undefined ? first : { op: 'or', children: nodes }
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
  const rawFilters = getRawFilters(effect).filter((filter) => filter != null && typeof filter === 'object')

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
  // type:'heroes'（targets 字段的英雄白名单，如 ed=196 hero_ids:[1..12]）同结构，一并提取。
  const heroIdAsts = rawFilters
    .filter((filter) => {
      const t = (filter as Record<string, unknown>).type
      return t === 'hero_ids' || t === 'heroes'
    })
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
  const singleChild = uniqueChildren[0]
  return { predicate: uniqueChildren.length === 1 && singleChild !== undefined ? singleChild : { op: 'and', children: uniqueChildren } }
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
    .filter((filter) => filter != null && typeof filter === 'object')
    .map((filter) => {
      const f = filter as Record<string, unknown>
      const stat = typeof f.stat === 'string' ? (f.stat).toLowerCase() : null
      const checkStr = typeof f.check === 'string' ? f.check : null
      const comparisonStr = typeof f.comparison === 'string' ? f.comparison : null
      const operator = normalizeComparisonOperator(checkStr ?? comparisonStr ?? '>=')
      const scoreNum = typeof f.score === 'number' ? f.score : null
      const checkNum = typeof f.check === 'number' ? f.check : null
      const valueNum = typeof f.value === 'number' ? f.value : null
      const rawValue = scoreNum ?? checkNum ?? valueNum

      if (stat == null || stat === '' || rawValue === null || operator == null) {
        return null
      }

      return {
        operator,
        stat: stat as HeroStatKey,
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
  if (stackFuncData != null && typeof stackFuncData === 'object') {
    const tag = (stackFuncData as Record<string, unknown>).tag
    if (typeof tag === 'string') return tag
  }
  return null
}

// eslint-disable-next-line complexity -- signal 归一化天然多分支（tag/stat/attack/per_hero_expr/stack_func_data 多来源 × target/count 路由），拆子函数需共享大量局部状态、增大改动面
export function attachSignalSemantics(signal: HeroAbilitySignal, effect: unknown): HeroAbilitySignal {
  const e: Record<string, unknown> = (effect != null && typeof effect === 'object') ? effect as Record<string, unknown> : {}
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
  const stackFuncDataPredicate = stackFuncDataTag != null && stackFuncDataTag !== '' ? parseHeroPredicate(stackFuncDataTag, 'shorthand') : null
  const stackFuncDataQualifier = stackFuncDataPredicate ? { predicate: stackFuncDataPredicate } : null

  // 有显式 count 限定来源（per_hero_expr 或 stack_func_data.tag）时，filter_targets 回归 target 语义。
  const hasExplicitCountQualifier = stackFuncDataQualifier !== null || perHeroQualifier !== null

  const legacyFilterQualifier = useFormationCountQualifier || keepTargetQualifier ? filterQualifier : null
  const formationCountQualifier: HeroQualifier | null =
    signal.formationCountQualifier
    ?? perHeroQualifier
    ?? stackFuncDataQualifier
    ?? legacyFilterQualifier

  // legacy filter→count 路径（stack_func 作 count 源、无显式 count 限定）：hero 作用域 buff 的 filter/count 同源
  // ——游戏描述统一为 "buff [F] 英雄 ... for each [F] Champion"（ed=2390 矮人 / ed=2883 中立 / buff_upgrade_per_any_tagged_crusader*），
  // target=null 会让非匹配 carry 也吃 buff（过度 buff）。此时 target = formationCountQualifier
  // （覆盖 filter_targets 与 wrapper effect_string 参数两种 tag 来源）。global 作用域 filter 仅作 count，target=all 保持 null。
  const heroScopedLegacyTarget =
    useFormationCountQualifier && !hasExplicitCountQualifier && POOL_SCOPE_BY_KIND[signal.kind] === 'hero'
      ? formationCountQualifier
      : null

  const useExplicitTarget = hasExplicitCountQualifier || keepTargetQualifier
  const legacyTarget = useFormationCountQualifier ? heroScopedLegacyTarget : filterQualifier

  return {
    ...signal,
    targetQualifier:
      signal.targetQualifier
      ?? (useExplicitTarget ? filterQualifier : legacyTarget),
    formationCountQualifier,
    // 显式 targets（含 'all'/'all_slots'）→ 记 {relation}；无 targets（自增益）→ null。
    // 'all' 必须显式记 {relation:'any'}：resolvePositionRelation 对 null 走类型默认（heroDpsMultiplier→'self'），
    // 若 'all' 降 null，阵型范围 hero_dps 信号（如蔚善良榜样 targets:all）会被误判自增益，support 位永不 buff carry。
    positionQualifier:
      signal.positionQualifier
      ?? (explicitTargeting.status === 'supported'
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
  activeEffectKeys?: ReadonlySet<string>,
): boolean {
  if (!qualifier) {
    return true
  }
  return evalHeroPredicate(qualifier.predicate, hero, activeEffectKeys)
}
