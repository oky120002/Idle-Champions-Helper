import { describe, expect, it } from 'vitest'
import { computeGoldBudgetBaseline } from '../../../../src/domain/simulator/goldBudgetBaseline'

describe('gold budget baseline', () => {
  it('cost curve 和预算能返回可负担等级', () => {
    const result = computeGoldBudgetBaseline({
      costCurve: (level: number) => Math.pow(1.5, level) as number,
      goldBudget: 1e10,
      specializationBaseline: 50,
    })

    expect(result.affordableLevel).toBeGreaterThan(0)
    expect(result.affordableLevel).toBeLessThan(1000)
  })

  it('低于专精要求的预算会标记 below-baseline', () => {
    const result = computeGoldBudgetBaseline({
      costCurve: (level: number) => Math.pow(2, level) as number,
      goldBudget: 100,
      specializationBaseline: 50,
    })

    expect(result.belowBaseline).toBe(true)
    expect(result.affordableLevel).toBeLessThan(50)
  })

  it('UI 默认值不暴露 100 级模式', () => {
    const result = computeGoldBudgetBaseline({
      costCurve: (level: number) => Math.pow(1.5, level) as number,
      goldBudget: 1e10,
      specializationBaseline: 50,
    })

    // Result should not contain internal 100-level mode flag
    expect(result).not.toHaveProperty('mode100')
    expect(result).not.toHaveProperty('hardcoreMode')
  })

  it('零预算返回 0 级', () => {
    const result = computeGoldBudgetBaseline({
      costCurve: (level: number) => Math.pow(1.5, level) as number,
      goldBudget: 0,
      specializationBaseline: 50,
    })

    expect(result.affordableLevel).toBe(0)
    expect(result.belowBaseline).toBe(true)
  })

  it('超大预算不崩溃', () => {
    const result = computeGoldBudgetBaseline({
      costCurve: (level: number) => Math.pow(1.5, level) as number,
      goldBudget: 1e300,
      specializationBaseline: 50,
    })

    expect(result.affordableLevel).toBeGreaterThan(0)
    expect(result.belowBaseline).toBe(false)
  })
})
