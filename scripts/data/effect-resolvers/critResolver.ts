import type { HeroAbilityAmountFunc, HeroAbilityKind } from '../../../src/domain/abilities/abilityModel'
import { buildSimplePoolSignal, type EffectResolveContext, type EffectSignalResult } from './resolverShared.ts'

/**
 * crit effect 名 → (kind, amountFunc) 映射。
 * 默认暴击 chance/damage 由 crit_factor 公式（steadyStateScoring）应用，不在此处。
 */
const CRIT_KIND_BY_EFFECT: Record<string, { kind: HeroAbilityKind; amountFunc: HeroAbilityAmountFunc }> = {
  buff_base_crit_chance_add: { kind: 'heroCritChance', amountFunc: 'add' },
  buff_base_crit_chance_mult: { kind: 'heroCritChance', amountFunc: 'mult' },
  buff_base_crit_damage: { kind: 'heroCritDamage', amountFunc: 'add' },
  buff_base_crit_damage_mult: { kind: 'heroCritDamage', amountFunc: 'mult' },
  global_buff_base_crit_chance_add: { kind: 'globalCritChance', amountFunc: 'add' },
  global_buff_base_crit_damage_add: { kind: 'globalCritDamage', amountFunc: 'add' },
  global_buff_base_crit_damage_mult: { kind: 'globalCritDamage', amountFunc: 'mult' },
}

// 暴击池（chance/damage 各 global/hero；默认值来自 default_crit_info，在 crit_factor 公式应用，不在解析层）。
export function resolveCritSignal(ctx: EffectResolveContext): EffectSignalResult | null {
  const match = CRIT_KIND_BY_EFFECT[ctx.effectName]
  return match ? buildSimplePoolSignal(ctx, match.kind, match.amountFunc, 'supportSignals') : null
}
