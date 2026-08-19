import { describe, expect, it } from 'vitest'
import { Decimal } from 'decimal.js'

import { computeSingleHitDamage } from './budCalculation'

describe('budCalculation', () => {
  it('单次伤害 = heroDps × cooldown（单目标）', () => {
    expect(computeSingleHitDamage(new Decimal(100), 5).toNumber()).toBe(500)
    expect(computeSingleHitDamage(new Decimal(2.5), 4).toNumber()).toBeCloseTo(10, 6)
  })

  it('cooldown 缺失回退默认 1', () => {
    expect(computeSingleHitDamage(new Decimal(50), null).toNumber()).toBe(50)
  })

  it('显式非法 cooldown 直接抛异常', () => {
    for (const cooldown of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => computeSingleHitDamage(new Decimal(50), cooldown)).toThrow()
    }
  })

  it('多段攻击：per-target BUD = heroDps × cooldown / numTargets', () => {
    // 法莉德型：3 目标 → per-target 伤害 = 总伤害 / 3（修正前不除 numTargets 偏高 3 倍）
    expect(computeSingleHitDamage(new Decimal(300), 1, 3).toNumber()).toBe(100)
    // 5 目标全系数 → per-target = 总 / 5
    expect(computeSingleHitDamage(new Decimal(500), 1, 5).toNumber()).toBe(100)
  })

  it('numTargets 缺失或为 0 回退默认 1', () => {
    expect(computeSingleHitDamage(new Decimal(100), 5, null).toNumber()).toBe(500)
    expect(computeSingleHitDamage(new Decimal(100), 5, 0).toNumber()).toBe(500)
    expect(computeSingleHitDamage(new Decimal(100), 5).toNumber()).toBe(500)
  })

  it('显式非法 numTargets 直接抛异常', () => {
    for (const numTargets of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => computeSingleHitDamage(new Decimal(100), 5, numTargets)).toThrow()
    }
  })
})
