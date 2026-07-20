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

export declare function normalizeTargetQualifier(effect: unknown): HeroQualifier | null

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
