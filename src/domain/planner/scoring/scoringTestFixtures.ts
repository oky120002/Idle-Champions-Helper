import type { HeroAbilityKind } from '../../abilities/abilityModel'
import type { PlacementFitScorePart } from '../placementFit'

// 构造维度单测用的 PlacementFitScorePart：默认 active=true、amountFunc=null(add)、monsterTags=null。
export function buildScorePart(overrides: {
  signalKind: HeroAbilityKind
  multiplier: number
  amountFunc?: 'add' | 'mult' | null
  active?: boolean
  monsterTags?: string[] | null
}): PlacementFitScorePart {
  return {
    signalKind: overrides.signalKind,
    rawEffect: 'test',
    multiplier: overrides.multiplier,
    active: overrides.active ?? true,
    reasonCode: 'global-match',
    source: 'official-parsed',
    amountFunc: overrides.amountFunc ?? null,
    monsterTags: overrides.monsterTags ?? null,
  }
}
