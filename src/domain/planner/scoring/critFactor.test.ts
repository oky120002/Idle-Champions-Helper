import { describe, expect, it } from 'vitest'
import { computeCritFactor } from './critFactor'
import { buildScorePart } from './scoringTestFixtures'

// BASE_CRIT_FACTOR = 1 + 0.025 × (2−1) = 1.025

describe('computeCritFactor', () => {
  it('无 crit signal → 1.0（基线归一抵消，非 crit 阵型 carryDps 不变）', () => {
    expect(computeCritFactor([])).toBe(1)
  })

  it('非 active 的 crit part 不计入 → 1.0', () => {
    const parts = [buildScorePart({ signalKind: 'heroCritChance', multiplier: 2, active: false })]
    expect(computeCritFactor(parts)).toBe(1)
  })

  it('heroCritChance add +100% → chance 提升后期望因子', () => {
    // chanceAddPercent=100: totalChance=(2.5+100)/100=1.025, damageMult=2
    // rawCrit = 1 + 1.025×(2−1) = 2.025; /1.025 ≈ 1.9756
    const parts = [buildScorePart({ signalKind: 'heroCritChance', multiplier: 2, amountFunc: null })]
    expect(computeCritFactor(parts)).toBeCloseTo(1.9756, 4)
  })

  it('heroCritDamage mult ×2 → damage 提升后期望因子', () => {
    // damageMult=2: totalChance=0.025, totalDamage=1+(100×2)/100=3
    // rawCrit = 1 + 0.025×(3−1) = 1.05; /1.025 ≈ 1.0244
    const parts = [buildScorePart({ signalKind: 'heroCritDamage', multiplier: 2, amountFunc: 'mult' })]
    expect(computeCritFactor(parts)).toBeCloseTo(1.0244, 4)
  })

  it('chance add 与 damage add 混合', () => {
    // chanceAddPercent=200 (mult=3→+200%), damageAddPercent=100 (mult=2→+100%)
    // totalChance=(2.5+200)/100=2.025, totalDamage=1+(100+100)/100=3
    // rawCrit = 1 + 2.025×(3−1) = 5.05; /1.025 ≈ 4.9268
    const parts = [
      buildScorePart({ signalKind: 'heroCritChance', multiplier: 3, amountFunc: null }),
      buildScorePart({ signalKind: 'heroCritDamage', multiplier: 2, amountFunc: null }),
    ]
    expect(computeCritFactor(parts)).toBeCloseTo(4.9268, 4)
  })

  it('globalCritChance 与 heroCritChance 同属 chance 维度', () => {
    const heroChance = computeCritFactor([buildScorePart({ signalKind: 'heroCritChance', multiplier: 2 })])
    const globalChance = computeCritFactor([buildScorePart({ signalKind: 'globalCritChance', multiplier: 2 })])
    expect(globalChance).toBe(heroChance)
  })

  it('任意 active crit signal 使因子 > 1', () => {
    const parts = [buildScorePart({ signalKind: 'heroCritDamage', multiplier: 1.5, amountFunc: 'mult' })]
    expect(computeCritFactor(parts)).toBeGreaterThan(1)
  })
})
