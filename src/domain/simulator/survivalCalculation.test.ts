import { describe, expect, it } from 'vitest'

import type { HeroAbilityProfile } from '../abilities/abilityModel'
import { computeEffectiveHealth, computeHealthLevelCurve } from './survivalCalculation'

function createHero(overrides: Partial<HeroAbilityProfile> = {}): HeroAbilityProfile {
  return {
    heroId: overrides.heroId ?? 'h',
    name: { original: 'h', display: 'h' },
    seat: overrides.seat ?? 1,
    roles: overrides.roles ?? [],
    tags: overrides.tags ?? [],
    baseAttackDamageTypes: overrides.baseAttackDamageTypes ?? [],
    baseAttackCooldown: overrides.baseAttackCooldown ?? null,
    age: overrides.age ?? null,
    abilityScores: overrides.abilityScores ?? {},
    baseDamage: overrides.baseDamage ?? 1,
    baseHealth: overrides.baseHealth ?? 1,
    healthCurves: overrides.healthCurves ?? null,
    costCurves: overrides.costCurves ?? null,
    carrySignals: overrides.carrySignals ?? [],
    supportSignals: overrides.supportSignals ?? [],
    unsupportedSignals: overrides.unsupportedSignals ?? [],
    sourceBreakdown: overrides.sourceBreakdown ?? { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
  }
}

describe('survivalCalculation', () => {
  it('computeHealthLevelCurve = healthCurves["1"]^level', () => {
    const hero = createHero({ healthCurves: { '1': 1.05 } })
    expect(computeHealthLevelCurve(hero, 1).toNumber()).toBeCloseTo(1.05, 6)
    expect(computeHealthLevelCurve(hero, 0).toNumber()).toBe(1)
  })

  it('computeEffectiveHealth = baseHealth × levelCurve × healthPool', () => {
    const hero = createHero({ baseHealth: 100, healthCurves: { '1': 1.05 } })
    // level 1: 100 × 1.05 × 2 = 210
    expect(computeEffectiveHealth(hero, 1, 2).toNumber()).toBeCloseTo(210, 5)
  })

  it('healthPool=0 保留零结果', () => {
    const hero = createHero({ baseHealth: 50, healthCurves: { '1': 1 } })
    expect(computeEffectiveHealth(hero, 1, 0).toNumber()).toBe(0)
  })

  it('基础生命、等级或生命池为非法值时直接抛异常', () => {
    expect(() => computeEffectiveHealth(createHero({ baseHealth: 0 }), 1, 1)).toThrow()
    expect(() => computeEffectiveHealth(createHero(), -1, 1)).toThrow()
    expect(() => computeEffectiveHealth(createHero(), 1, Number.NaN)).toThrow()
    expect(() => computeEffectiveHealth(createHero(), 1, -1)).toThrow()
    expect(() => computeEffectiveHealth(createHero(), 1, Number.POSITIVE_INFINITY)).toThrow()
  })

  it('healthCurves 缺失回退默认率 1.06', () => {
    const hero = createHero({ baseHealth: 10, healthCurves: null })
    expect(computeHealthLevelCurve(hero, 1).toNumber()).toBeCloseTo(1.06, 6)
  })
})
