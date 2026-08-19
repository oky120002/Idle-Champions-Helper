import { describe, expect, it } from 'vitest'

import type { ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import { computeCarryDps, computeLevelCurve } from './baseDps'

function hero(overrides: Partial<ResolvedHeroAbilityProfile> = {}): ResolvedHeroAbilityProfile {
  return {
    heroId: 'h',
    name: { original: 'h', display: 'h' },
    seat: 1,
    roles: [],
    tags: [],
    baseAttackDamageTypes: [],
    baseAttackCooldown: null,
    age: null,
    abilityScores: {},
    baseDamage: 1,
    baseHealth: 1,
    costCurves: null,
    carrySignals: [],
    supportSignals: [],
    unsupportedSignals: [],
    sourceBreakdown: {
      carrySignals: [],
      supportSignals: [],
      unsupportedSignals: [],
    },
    ...overrides,
  }
}

describe('computeLevelCurve', () => {
  it('读取 hero.costCurves["1"] 作为指数底', () => {
    expect(computeLevelCurve(hero({ costCurves: { '1': 1.13 } }), 1).toNumber()).toBeCloseTo(1.13, 10)
  })

  it('per-hero rate 在高等级造成数量级差异，直接决定 carry 排序', () => {
    const slow = computeLevelCurve(hero({ costCurves: { '1': 1.06 } }), 500)
    const fast = computeLevelCurve(hero({ costCurves: { '1': 1.15 } }), 500)
    // log10(1.15^500 / 1.06^500) ≈ 17.7——统一 rate 会抹平这个差距
    expect(fast.div(slow).log(10).toNumber()).toBeGreaterThan(10)
  })

  it('costCurves 缺失或非法时回退默认率 1.06', () => {
    expect(computeLevelCurve(hero({ costCurves: null }), 1).toNumber()).toBeCloseTo(1.06, 5)
    expect(computeLevelCurve(hero({ costCurves: { '1': 0 } }), 1).toNumber()).toBeCloseTo(1.06, 5)
  })

  it('负 level 截断为 0，levelCurve=1', () => {
    expect(computeLevelCurve(hero({ costCurves: { '1': 1.1 } }), -5).toNumber()).toBe(1)
  })
})

describe('computeCarryDps', () => {
  it('baseDamage × levelCurve × aggregate', () => {
    const dps = computeCarryDps(hero({ baseDamage: 12000, costCurves: { '1': 1.13 } }), 1, 3)
    expect(dps.toNumber()).toBeCloseTo(12000 * 1.13 * 3, 3)
  })

  it('baseDamage<=0 仍回退 1，但零 aggregate 保留为零', () => {
    const dps = computeCarryDps(hero({ baseDamage: 0, costCurves: { '1': 1.1 } }), 1, 0)
    expect(dps.toNumber()).toBe(0)
  })
})
