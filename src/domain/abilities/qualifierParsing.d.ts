import type {
  HeroComparisonOperator,
  HeroQualifier,
} from './abilityModel'

export declare function buildAgeQualifier(
  operator: HeroComparisonOperator,
  value: number,
  excludedHeroId?: string | null,
): HeroQualifier

export declare function parseTagDisjunction(expr: unknown): Pick<HeroQualifier, 'requiredTags' | 'matchMode'> | null

export declare function mergeHeroQualifiers(
  leftQualifier: HeroQualifier,
  rightQualifier: HeroQualifier,
): HeroQualifier | null

export declare function splitExprAtTopLevel(expr: string, delimiter: string): string[]

export declare function stripExprOuterParentheses(expr: string): string
