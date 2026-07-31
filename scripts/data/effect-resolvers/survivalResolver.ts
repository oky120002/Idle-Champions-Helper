import type { HeroAbilityAmountFunc, HeroAbilityKind } from '../../../src/domain/abilities/abilityModel'
import { resolvePoolSignal, type EffectResolveContext, type EffectSignalResult } from './resolverShared.ts'

/**
 * survival effect 名 → (kind, amountFunc) 映射。
 * health/healing 折入 health multiplier（MVP：healing 近似为生命加成，survival 软约束）；
 * damage_reduction 单独 kind（玩家侧减伤，作用于 incoming damage）。
 */
const SURVIVAL_KIND_BY_EFFECT: Record<string, { kind: HeroAbilityKind; amountFunc: HeroAbilityAmountFunc }> = {
  health_mult: { kind: 'heroHealthMultiplier', amountFunc: 'add' },
  increase_health_by_source_percent: { kind: 'heroHealthMultiplier', amountFunc: 'add' },
  healing_mult: { kind: 'heroHealthMultiplier', amountFunc: 'add' },
  global_healing_mult: { kind: 'globalHealthMultiplier', amountFunc: 'add' },
  global_health_mult: { kind: 'globalHealthMultiplier', amountFunc: 'add' },
  damage_reduction: { kind: 'damageReduction', amountFunc: 'add' },
  damage_reduction_ranged: { kind: 'damageReduction', amountFunc: 'add' },
  fixed_damage_reduction_all_enemy_attacks: { kind: 'damageReduction', amountFunc: 'add' },
  trials_damage_reduction_mult: { kind: 'damageReduction', amountFunc: 'mult' },
}

// survival 池（health/healing/damage_reduction）。bucket 由 resolvePoolSignal 按 pool scope + targeting 判定。
export function resolveSurvivalSignal(ctx: EffectResolveContext): EffectSignalResult | null {
  const match = SURVIVAL_KIND_BY_EFFECT[ctx.effectName]
  return match ? resolvePoolSignal(ctx, match.kind, match.amountFunc) : null
}
