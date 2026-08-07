import { describe, expect, it } from 'vitest'
import { toGameNumber } from '../gameNumber'
import {
  computeAffordableLevel,
  computeCumulativeLevelCost,
  computeMaxGoldForLevel,
} from './goldBudgetBaseline'

describe('computeCumulativeLevelCost', () => {
  it('level=0 返回 0', () => {
    expect(computeCumulativeLevelCost(5, 1.06, 0).eq(0)).toBe(true)
  })

  it('level=1 返回 baseCost（首次升级费用）', () => {
    expect(computeCumulativeLevelCost(5, 1.06, 1).toNumber()).toBe(5)
  })

  it('Bruenor baseCost=5 rate=1.06 level=10 与手算一致', () => {
    const expected = (5 * (Math.pow(1.06, 10) - 1)) / 0.06
    expect(computeCumulativeLevelCost(5, 1.06, 10).toNumber()).toBeCloseTo(expected, 1)
  })

  it('Bruenor baseCost=5 rate=1.06 level=100 与手算一致', () => {
    const expected = (5 * (Math.pow(1.06, 100) - 1)) / 0.06
    expect(computeCumulativeLevelCost(5, 1.06, 100).toNumber()).toBeCloseTo(expected, 0)
  })

  it('超大 level=8000 不溢出（decimal.js 任意精度）', () => {
    const result = computeCumulativeLevelCost(5, 1.06, 8000)
    expect(result.e).toBeGreaterThan(100)
    expect(result.isFinite()).toBe(true)
  })

  it('不同英雄不同 rate 结果保序（高 rate 升级更贵）', () => {
    const bruenor = computeCumulativeLevelCost(5, 1.06, 100)
    const nayeli = computeCumulativeLevelCost(1000, 1.15, 100)
    expect(nayeli.gt(bruenor)).toBe(true)
  })
})

describe('computeAffordableLevel', () => {
  it('金币恰好等于 level 100 累计费用 → 返回 100', () => {
    const cost = computeCumulativeLevelCost(5, 1.06, 100)
    const level = computeAffordableLevel(5, { '1': 1.06 }, cost)
    expect(level).toBe(100)
  })

  it('金币不足 level 1 → 返回 0', () => {
    const level = computeAffordableLevel(5, { '1': 1.06 }, toGameNumber(3))
    expect(level).toBe(0)
  })

  it('金币恰好等于 level 1 → 返回 1', () => {
    const level = computeAffordableLevel(5, { '1': 1.06 }, toGameNumber(5))
    expect(level).toBe(1)
  })

  it('超大金币不无限搜索', () => {
    const level = computeAffordableLevel(5, { '1': 1.06 }, toGameNumber('1e1000'))
    expect(level).toBeGreaterThan(0)
    expect(level).toBeLessThanOrEqual(10000)
  })

  it('零金币 → 返回 0', () => {
    const level = computeAffordableLevel(5, { '1': 1.06 }, toGameNumber(0))
    expect(level).toBe(0)
  })
})

describe('computeMaxGoldForLevel', () => {
  const heroes = [
    { baseCost: 5, costCurves: { '1': 1.06 } },
    { baseCost: 1000, costCurves: { '1': 1.15 } },
    { baseCost: 50, costCurves: { '1': 1.1 } },
  ]

  it('level=0 → 返回 0', () => {
    expect(computeMaxGoldForLevel(heroes, 0).eq(0)).toBe(true)
  })

  it('返回所有英雄中最贵的累计费用', () => {
    const max = computeMaxGoldForLevel(heroes, 100)
    // Nayeli (baseCost=1000, rate=1.15) 应该最贵
    const nayeliCost = computeCumulativeLevelCost(1000, 1.15, 100)
    expect(max.eq(nayeliCost)).toBe(true)
  })

  it('空英雄列表 → 返回 0', () => {
    expect(computeMaxGoldForLevel([], 100).eq(0)).toBe(true)
  })
})

describe('金币↔等级双向闭环', () => {
  it('金币→等级→反算金币 >= 原金币（等级向下取整）', () => {
    const originalGold = toGameNumber(50000)
    const level = computeAffordableLevel(5, { '1': 1.06 }, originalGold)
    const reverseGold = computeCumulativeLevelCost(5, 1.06, level)
    // 反算金币 <= 原金币（因为等级向下取整）
    expect(reverseGold.lte(originalGold)).toBe(true)
    // 但下一个等级的费用 > 原金币
    const nextLevelCost = computeCumulativeLevelCost(5, 1.06, level + 1)
    expect(nextLevelCost.gt(originalGold)).toBe(true)
  })
})
