import { describe, expect, it } from 'vitest'
import { extractSpecializationBaseline } from '../../../../src/domain/simulator/specializationBaseline'

describe('specialization baseline extraction', () => {
  it('从三个专精升级中返回最高所需等级', () => {
    const upgrades = [
      { requiredLevel: 50, upgradeType: 'specialization' },
      { requiredLevel: 120, upgradeType: 'specialization' },
      { requiredLevel: 80, upgradeType: 'specialization' },
    ]

    const result = extractSpecializationBaseline(upgrades)

    expect(result.baseline).toBe(120)
  })

  it('没有 specialization upgrades 时使用 fallback 解锁等级', () => {
    const upgrades = [
      { requiredLevel: 30, upgradeType: 'ability' },
      { requiredLevel: 60, upgradeType: 'buff' },
    ]

    const result = extractSpecializationBaseline(upgrades)

    expect(result.baseline).toBeGreaterThan(0)
    expect(result.usedFallback).toBe(true)
  })

  it('异常等级被忽略并记录 warning', () => {
    const upgrades = [
      { requiredLevel: 50, upgradeType: 'specialization' },
      { requiredLevel: -10, upgradeType: 'specialization' },
      { requiredLevel: NaN, upgradeType: 'specialization' },
      { requiredLevel: 1.5, upgradeType: 'specialization' },
    ]

    const result = extractSpecializationBaseline(upgrades)

    expect(result.baseline).toBe(50)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('空 upgrades 列表返回 fallback', () => {
    const result = extractSpecializationBaseline([])

    expect(result.usedFallback).toBe(true)
    expect(result.baseline).toBeGreaterThan(0)
  })
})
