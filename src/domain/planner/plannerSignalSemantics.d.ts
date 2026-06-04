import type {
  PlannerComparisonOperator,
  PlannerEffectSignal,
  PlannerHeroQualifier,
  PlannerSignalAmountFunc,
  PlannerSignalSource,
  ResolvedPlannerHeroModel,
} from './plannerModel'

type PlannerSignalSemanticFields = Pick<
  PlannerEffectSignal,
  | 'targetQualifier'
  | 'formationCountQualifier'
  | 'amountFunc'
  | 'stackFunc'
  | 'applyManually'
  | 'stacksMultiply'
  | 'excludeSelf'
>

export function normalizePlannerSignalAmountFunc(value: unknown): PlannerSignalAmountFunc | null

export function normalizePlannerTargetQualifier(effect: unknown): PlannerHeroQualifier | null

export function normalizePlannerStatQualifiers(effect: unknown): Array<{
  stat: string
  operator: PlannerComparisonOperator
  value: number
}> | null

export function parsePlannerPerHeroExpr(expr: unknown): PlannerHeroQualifier | null

export function attachPlannerSignalSemantics<
  T extends {
    kind: PlannerEffectSignal['kind']
    value: number
    rawEffect: string
    source: PlannerSignalSource
  },
>(signal: T, effect: unknown): T & PlannerSignalSemanticFields

export function matchesPlannerHeroQualifier(
  hero: Pick<ResolvedPlannerHeroModel, 'heroId' | 'tags' | 'baseAttackDamageTypes' | 'age' | 'abilityScores'>,
  qualifier: PlannerHeroQualifier | null | undefined,
): boolean
