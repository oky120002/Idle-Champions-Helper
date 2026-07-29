import Decimal from 'decimal.js'
import { describe, expect, test } from 'vitest'

import { estimateMaxArea } from './areaEstimation'
import { monsterHealthAt } from './monsterStats'

describe('estimateMaxArea', () => {
  test('高 BUD 阵型预估层数 > 低 BUD', () => {
    const low = estimateMaxArea({ bud: monsterHealthAt(50), effectiveHealth: null })
    const high = estimateMaxArea({ bud: monsterHealthAt(100), effectiveHealth: null })
    expect(high.area).toBeGreaterThan(low.area)
  })

  test('BUD = monsterHealthAt(N) 时预估可推到 ≥ N', () => {
    // BUD 恰好等于某层怪物生命 → 该层可击杀（one-shot BUD ≥ HP）
    const result = estimateMaxArea({ bud: monsterHealthAt(75), effectiveHealth: null })
    expect(result.area).toBeGreaterThanOrEqual(75)
  })

  test('survival 不足时受限（effectiveHealth < monsterDps 限制层数）', () => {
    // 高 BUD 但 effectiveHealth 极低 → survival 约束绑定
    const highBudLowSurvival = estimateMaxArea({
      bud: monsterHealthAt(500),
      effectiveHealth: new Decimal(1),
    })
    const noSurvivalLimit = estimateMaxArea({
      bud: monsterHealthAt(500),
      effectiveHealth: null,
    })
    expect(highBudLowSurvival.area).toBeLessThan(noSurvivalLimit.area)
    expect(highBudLowSurvival.boundBy).toBe('survival')
  })

  test('survival 充足时由 BUD 绑定', () => {
    const result = estimateMaxArea({
      bud: monsterHealthAt(100),
      effectiveHealth: new Decimal(1e30),
    })
    expect(result.boundBy).toBe('bud')
  })

  test('预估层数不超过 MAX_AREA', () => {
    const result = estimateMaxArea({
      bud: new Decimal('1e1000'),
      effectiveHealth: new Decimal('1e1000'),
    })
    expect(result.area).toBeLessThanOrEqual(2501)
  })

  test('BUD 为 0 时预估层数 1（area 1 怪物生命 10 > 0）', () => {
    const result = estimateMaxArea({ bud: new Decimal(0), effectiveHealth: null })
    expect(result.area).toBe(1)
  })
})
