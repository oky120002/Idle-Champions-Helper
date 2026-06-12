import type {
  PlannerEffectSignal,
  PlannerHeroQualifier,
  PlannerPositionRelation,
  ResolvedPlannerHeroModel,
} from './plannerModel'

export interface PlannerExplicitTargetingNone {
  status: 'none'
  relation: 'any'
}

export interface PlannerExplicitTargetingSupported {
  status: 'supported'
  relation: PlannerPositionRelation
}

export interface PlannerExplicitTargetingUnsupported {
  status: 'unsupported'
  note: string
}

export type PlannerExplicitTargeting =
  | PlannerExplicitTargetingNone
  | PlannerExplicitTargetingSupported
  | PlannerExplicitTargetingUnsupported

export declare function normalizePlannerSignalAmountFunc(
  value: unknown,
): 'add' | 'mult' | 'unknown' | null

export declare function normalizePlannerExplicitTargeting(effect: unknown): PlannerExplicitTargeting

export declare function normalizePlannerTargetQualifier(effect: unknown): PlannerHeroQualifier | null

export declare function normalizePlannerStatQualifiers(
  effect: unknown,
): NonNullable<PlannerHeroQualifier['requiredStats']> | null

export declare function parsePlannerPerHeroExpr(expr: unknown): PlannerHeroQualifier | null

export declare function attachPlannerSignalSemantics(
  signal: PlannerEffectSignal,
  effect: unknown,
): PlannerEffectSignal

export declare function matchesPlannerHeroQualifier(
  hero: ResolvedPlannerHeroModel,
  qualifier: PlannerHeroQualifier | null | undefined,
): boolean
