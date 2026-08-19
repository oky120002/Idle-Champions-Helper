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

  it('负数、NaN、Infinity level 直接抛异常', () => {
    expect(() => computeLevelCurve(hero({ costCurves: { '1': 1.1 } }), -5)).toThrow()
    expect(() => computeLevelCurve(hero({ costCurves: { '1': 1.1 } }), Number.NaN)).toThrow()
    expect(() => computeLevelCurve(hero({ costCurves: { '1': 1.1 } }), Number.POSITIVE_INFINITY)).toThrow()
  })
})

describe('computeCarryDps', () => {
  it('baseDamage × levelCurve × aggregate', () => {
    const dps = computeCarryDps(hero({ baseDamage: 12000, costCurves: { '1': 1.13 } }), 1, 3)
    expect(dps.toNumber()).toBeCloseTo(12000 * 1.13 * 3, 3)
  })

  it('零 aggregate 保留为零', () => {
    const dps = computeCarryDps(hero({ baseDamage: 10, costCurves: { '1': 1.1 } }), 1, 0)
    expect(dps.toNumber()).toBe(0)
  })

  it('基础伤害为零、负数或非有限值时直接抛异常', () => {
    for (const baseDamage of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => computeCarryDps(hero({ baseDamage }), 1, 1)).toThrow()
    }
  })

  it('伤害聚合值为负数或非有限值时直接抛异常', () => {
    for (const aggregate of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => computeCarryDps(hero({ baseDamage: 10 }), 1, aggregate)).toThrow()
    }
  })
})
