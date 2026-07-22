import { describe, expect, it } from 'vitest'
import Decimal from 'break_eternity.js'

import type { HeroAbilityProfile } from '../abilities/abilityModel'
import { canSurviveBurst, computeEffectiveHealth, computeHealthLevelCurve } from './survivalCalculation'

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

  it('healthPool 缺失/非正回退 1', () => {
    const hero = createHero({ baseHealth: 50, healthCurves: { '1': 1 } })
    expect(computeEffectiveHealth(hero, 1, 0).toNumber()).toBeCloseTo(50, 5)
    expect(computeEffectiveHealth(hero, 1, NaN).toNumber()).toBeCloseTo(50, 5)
  })

  it('healthCurves 缺失回退默认率 1.06', () => {
    const hero = createHero({ baseHealth: 10, healthCurves: null })
    expect(computeHealthLevelCurve(hero, 1).toNumber()).toBeCloseTo(1.06, 6)
  })

  it('canSurviveBurst：effectiveHealth ≥ 单次伤害方可存活（5.3 约束）', () => {
    expect(canSurviveBurst(new Decimal(100), new Decimal(50))).toBe(true)
    expect(canSurviveBurst(new Decimal(100), new Decimal(100))).toBe(true)
    expect(canSurviveBurst(new Decimal(100), new Decimal(101))).toBe(false)
  })
})
