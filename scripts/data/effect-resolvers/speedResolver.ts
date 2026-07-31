import type { HeroAbilityAmountFunc, HeroAbilityKind } from '../../../src/domain/abilities/abilityModel'
import { resolvePoolSignal, type EffectResolveContext, type EffectSignalResult } from './resolverShared.ts'

/**
 * speed/cooldown effect 名 → (kind, amountFunc) 映射。
 * attack_speed_mult/time_scale → attackSpeedMult（mult）；reduce_attack_cooldown → attackSpeedMult（add，
 * 减少攻击冷却=提速）；reduce_ultimate_cooldown/ability_cooldown_reduction_mult → cooldownReduction。
 */
const SPEED_KIND_BY_EFFECT: Record<string, { kind: HeroAbilityKind; amountFunc: HeroAbilityAmountFunc }> = {
  base_attack_speed_mult: { kind: 'attackSpeedMult', amountFunc: 'mult' },
  ult_attack_speed_mult: { kind: 'attackSpeedMult', amountFunc: 'mult' },
  time_scale: { kind: 'attackSpeedMult', amountFunc: 'mult' },
  time_scale_when_not_attacked: { kind: 'attackSpeedMult', amountFunc: 'mult' },
  reduce_attack_cooldown: { kind: 'attackSpeedMult', amountFunc: 'add' },
  reduce_ultimate_cooldown: { kind: 'cooldownReduction', amountFunc: 'add' },
  ability_cooldown_reduction_mult: { kind: 'cooldownReduction', amountFunc: 'mult' },
}

// speed/cooldown 池（进 pool 供覆盖率与未来 ult/step-simulation 消费；7.2 决定不进 carryDps——
// hero_dps 按秒模型，speed 精确建模依赖 BUD/cooldown，MVP 暂不应用）。
export function resolveSpeedSignal(ctx: EffectResolveContext): EffectSignalResult | null {
  const match = SPEED_KIND_BY_EFFECT[ctx.effectName]
  return match ? resolvePoolSignal(ctx, match.kind, match.amountFunc) : null
}
