import { describe, expect, it } from 'vitest'
import Decimal from 'break_eternity.js'

import { computeBud, computeSingleHitDamage } from './budCalculation'

describe('budCalculation', () => {
  it('单次伤害 = heroDps × cooldown', () => {
    expect(computeSingleHitDamage(new Decimal(100), 5).toNumber()).toBe(500)
    expect(computeSingleHitDamage(new Decimal(2.5), 4).toNumber()).toBeCloseTo(10, 6)
  })

  it('BUD = max(各英雄单次伤害)，慢攻击英雄 BUD 更高', () => {
    // 同 DPS，慢攻击（cooldown 10）单次伤害 = 1000 > 快攻击（cooldown 1）= 100
    const fast = { heroDps: new Decimal(100), attackCooldown: 1 }
    const slow = { heroDps: new Decimal(100), attackCooldown: 10 }
    expect(computeBud([fast, slow]).toNumber()).toBe(1000)
  })

  it('cooldown 缺失/非正回退默认 1', () => {
    expect(computeSingleHitDamage(new Decimal(50), null).toNumber()).toBe(50)
    expect(computeSingleHitDamage(new Decimal(50), 0).toNumber()).toBe(50)
  })

  it('空阵型 BUD = 0', () => {
    expect(computeBud([]).eq(0)).toBe(true)
  })
})
