import type { HeroPredicateAST, ResolvedHeroAbilityProfile } from './abilityModel'

export type HeroPredicateDialect = 'shorthand' | 'functional'

export declare function parseHeroPredicate(
  expr: unknown,
  dialect: HeroPredicateDialect,
): HeroPredicateAST | null

export declare function evalHeroPredicate(
  ast: HeroPredicateAST,
  hero: ResolvedHeroAbilityProfile,
): boolean

export declare function predicateHasNode(
  ast: HeroPredicateAST | null | undefined,
  op: HeroPredicateAST['op'],
): boolean
