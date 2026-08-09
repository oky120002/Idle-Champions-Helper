import { describe, expect, it } from 'vitest'
import { Decimal } from 'decimal.js'

import { computeSingleHitDamage } from './budCalculation'

describe('budCalculation', () => {
  it('单次伤害 = heroDps × cooldown（单目标）', () => {
    expect(computeSingleHitDamage(new Decimal(100), 5).toNumber()).toBe(500)
    expect(computeSingleHitDamage(new Decimal(2.5), 4).toNumber()).toBeCloseTo(10, 6)
  })

  it('cooldown 缺失/非正回退默认 1', () => {
    expect(computeSingleHitDamage(new Decimal(50), null).toNumber()).toBe(50)
    expect(computeSingleHitDamage(new Decimal(50), 0).toNumber()).toBe(50)
  })

  it('多段攻击：per-target BUD = heroDps × cooldown / numTargets', () => {
    // 法莉德型：3 目标 → per-target 伤害 = 总伤害 / 3（修正前不除 numTargets 偏高 3 倍）
    expect(computeSingleHitDamage(new Decimal(300), 1, 3).toNumber()).toBe(100)
    // 5 目标全系数 → per-target = 总 / 5
    expect(computeSingleHitDamage(new Decimal(500), 1, 5).toNumber()).toBe(100)
  })

  it('numTargets 缺失/非正回退默认 1（向后兼容）', () => {
    expect(computeSingleHitDamage(new Decimal(100), 5, null).toNumber()).toBe(500)
    expect(computeSingleHitDamage(new Decimal(100), 5, 0).toNumber()).toBe(500)
    expect(computeSingleHitDamage(new Decimal(100), 5).toNumber()).toBe(500)
  })
})
