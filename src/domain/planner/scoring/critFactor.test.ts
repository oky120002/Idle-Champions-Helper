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

describe('computeCritFactor · per-hero base crit（set_base_crit_chance 覆盖默认 2.5%）', () => {
  // 归一锚 BASE_CRIT_FACTOR = 1 + 0.025×(2−1) = 1.025（全局默认 base，作归一基准不变）。
  // per-hero base crit 覆盖默认：无 crit signal 时不再强制 1.0，保留 innate 暴击期望（carry 排序感知）。
  it('20% base、无 crit signal → ~1.1707（高 base crit 自带暴击期望增益）', () => {
    // totalChance=0.20, totalDamage=2.0, rawCrit=1+0.20×(2−1)=1.20, /1.025≈1.1707
    expect(computeCritFactor([], 20)).toBeCloseTo(1.1707, 4)
  })

  it('null/undefined base → 用默认 2.5%（无信号 → 1.0，与既有行为一致）', () => {
    expect(computeCritFactor([], null)).toBe(1)
    expect(computeCritFactor([])).toBe(1)
  })

  it('20% base + crit damage 信号 → base 与 damage 叠加，高于默认 base 同信号', () => {
    // 20% base + heroCritDamage mult×2: totalChance=0.20, totalDamage=1+(100×2)/100=3
    // rawCrit=1+0.20×(3−1)=1.40, /1.025≈1.3659
    const parts = [buildScorePart({ signalKind: 'heroCritDamage', multiplier: 2, amountFunc: 'mult' })]
    expect(computeCritFactor(parts, 20)).toBeCloseTo(1.3659, 4)
    // 默认 base 同信号：rawCrit=1+0.025×2=1.05, /1.025≈1.0244（base crit 提升让 crit damage 信号更值）
    expect(computeCritFactor(parts)).toBeCloseTo(1.0244, 4)
    expect(computeCritFactor(parts, 20)).toBeGreaterThan(computeCritFactor(parts))
  })
})

describe('computeCritFactor · 装备 crit mult（B1-d，第三参 equipmentCrit）', () => {
  it('equipmentCrit chanceMult/damageMult 各自乘进（无 ability crit signal）', () => {
    // chanceMult=2, damageMult=2: totalChance=2.5×2/100=0.05, totalDamage=1+(100×2)/100=3
    // rawCrit = 1 + 0.05×(3−1) = 1.1; /1.025 ≈ 1.0732
    expect(computeCritFactor([], undefined, { chanceMult: 2, damageMult: 2 })).toBeCloseTo(1.0732, 4)
  })

  it('equipmentCrit 与 ability critParts 叠加（damage mult 累乘：×2×2=4）', () => {
    // ability heroCritDamage mult×2 + equipment damageMult×2 → damageMult=4
    // totalChance=0.025, totalDamage=1+(100×4)/100=5; rawCrit=1+0.025×4=1.1; /1.025≈1.0732
    const parts = [buildScorePart({ signalKind: 'heroCritDamage', multiplier: 2, amountFunc: 'mult' })]
    expect(computeCritFactor(parts, undefined, { chanceMult: 1, damageMult: 2 })).toBeCloseTo(1.0732, 4)
  })

  it('null/undefined equipmentCrit → 不影响（向后兼容）', () => {
    expect(computeCritFactor([], undefined, null)).toBe(1)
    // 不传 equipmentCrit 等价于 undefined，由默认值兜底
    expect(computeCritFactor([])).toBe(1)
  })
})
