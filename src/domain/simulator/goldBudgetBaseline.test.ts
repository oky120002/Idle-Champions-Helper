import { describe, expect, it } from 'vitest'
import { computeCumulativeLevelCost, computeGoldBudgetBaseline } from './goldBudgetBaseline'

describe('computeCumulativeLevelCost', () => {
  it('level=0 返回 0', () => {
    expect(computeCumulativeLevelCost(5, 1.06, 0).eq(0)).toBe(true)
  })

  it('level=1 返回 baseCost（首次升级费用）', () => {
    expect(computeCumulativeLevelCost(5, 1.06, 1).toNumber()).toBe(5)
  })

  it('Bruenor baseCost=5 rate=1.06 level=10 与手算一致', () => {
    // 5 × (1.06^10 - 1) / 0.06 ≈ 65.9
    const expected = (5 * (Math.pow(1.06, 10) - 1)) / 0.06
    expect(computeCumulativeLevelCost(5, 1.06, 10).toNumber()).toBeCloseTo(expected, 1)
  })

  it('Bruenor baseCost=5 rate=1.06 level=100 与手算一致', () => {
    // 1.06^100 ≈ 339.3；5 × 338.3 / 0.06 ≈ 28191
    const expected = (5 * (Math.pow(1.06, 100) - 1)) / 0.06
    expect(computeCumulativeLevelCost(5, 1.06, 100).toNumber()).toBeCloseTo(expected, 0)
  })

  it('超大 level=8000 不溢出（decimal.js 任意精度）', () => {
    const result = computeCumulativeLevelCost(5, 1.06, 8000)
    // 1.06^8000 ≈ 10^200+
    expect(result.e).toBeGreaterThan(100)
    expect(result.isFinite()).toBe(true)
  })

  it('不同英雄不同 rate 结果保序（高 rate 升级更贵）', () => {
    const bruenor = computeCumulativeLevelCost(5, 1.06, 100)
    const nayeli = computeCumulativeLevelCost(1000, 1.15, 100)
    expect(nayeli.gt(bruenor)).toBe(true)
  })
})

describe('gold budget baseline', () => {
  it('cost curve 和预算能返回可负担等级', () => {
    const result = computeGoldBudgetBaseline({
      costCurve: (level: number) => Math.pow(1.5, level),
      goldBudget: 1e10,
      specializationBaseline: 50,
    })

    expect(result.affordableLevel).toBeGreaterThan(0)
    expect(result.affordableLevel).toBeLessThan(1000)
  })

  it('低于专精要求的预算会标记 below-baseline', () => {
    const result = computeGoldBudgetBaseline({
      costCurve: (level: number) => Math.pow(2, level),
      goldBudget: 100,
      specializationBaseline: 50,
    })

    expect(result.belowBaseline).toBe(true)
    expect(result.affordableLevel).toBeLessThan(50)
  })

  it('UI 默认值不暴露 100 级模式', () => {
    const result = computeGoldBudgetBaseline({
      costCurve: (level: number) => Math.pow(1.5, level),
      goldBudget: 1e10,
      specializationBaseline: 50,
    })

    // Result should not contain internal 100-level mode flag
    expect(result).not.toHaveProperty('mode100')
    expect(result).not.toHaveProperty('hardcoreMode')
  })

  it('零预算返回 0 级', () => {
    const result = computeGoldBudgetBaseline({
      costCurve: (level: number) => Math.pow(1.5, level),
      goldBudget: 0,
      specializationBaseline: 50,
    })

    expect(result.affordableLevel).toBe(0)
    expect(result.belowBaseline).toBe(true)
  })

  it('超大预算不崩溃', () => {
    const result = computeGoldBudgetBaseline({
      costCurve: (level: number) => Math.pow(1.5, level),
      goldBudget: 1e300,
      specializationBaseline: 50,
    })

    expect(result.affordableLevel).toBeGreaterThan(0)
    expect(result.belowBaseline).toBe(false)
  })
})
