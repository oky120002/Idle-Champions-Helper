/**
 * variant 规则约束类型。规则在 build 期由 `build-models.ts` 投影到
 * `scenario.forcedHeroes`，运行时只消费已投影的约束。
 */

export interface VariantConstraint {
  kind: 'forceInclude'
  heroIds: string[]
}

export interface VariantRuleResult {
  constraints: VariantConstraint[]
  warnings: string[]
}
