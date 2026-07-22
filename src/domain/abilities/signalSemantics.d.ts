import type {
  HeroAbilitySignal,
  HeroPredicateAST,
  HeroQualifier,
  HeroPositionRelation,
  HeroStatQualifier,
  ResolvedHeroAbilityProfile,
} from './abilityModel'

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

export declare function normalizeSignalAmountFunc(
  value: unknown,
): 'add' | 'mult' | 'unknown' | null

export declare function normalizeExplicitTargeting(effect: unknown): HeroExplicitTargeting

// effect 上所有 filter-like 结构（filter_targets / target_filters / target_filters_or /
// targets 中 filter-like 对象）的扁平合集；signal-coverage / effect-helpers 等脚本复用。
export declare function getRawFilters(effect: unknown): unknown[]

export declare function normalizeTargetQualifier(effect: unknown): HeroQualifier | null

// 合并两个 HeroQualifier（AND 语义）：null 取另一个，同结构去重。
export declare function mergeHeroQualifiers(
  left: HeroQualifier | null,
  right: HeroQualifier | null,
): HeroQualifier | null

export declare function normalizeStatQualifiers(
  effect: unknown,
): HeroStatQualifier[] | null

export declare function statQualifiersToNodes(
  statQualifiers: HeroStatQualifier[] | null,
): HeroPredicateAST[]

export declare function parsePerHeroExpr(expr: unknown): HeroPredicateAST | null

export declare function attachSignalSemantics(
  signal: HeroAbilitySignal,
  effect: unknown,
): HeroAbilitySignal

export declare function matchesHeroQualifier(
  hero: ResolvedHeroAbilityProfile,
  qualifier: HeroQualifier | null | undefined,
): boolean
