import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'

import { computeSingleHitDamage } from './budCalculation'

describe('budCalculation', () => {
  it('单次伤害 = heroDps × cooldown', () => {
    expect(computeSingleHitDamage(new Decimal(100), 5).toNumber()).toBe(500)
    expect(computeSingleHitDamage(new Decimal(2.5), 4).toNumber()).toBeCloseTo(10, 6)
  })

  it('cooldown 缺失/非正回退默认 1', () => {
    expect(computeSingleHitDamage(new Decimal(50), null).toNumber()).toBe(50)
    expect(computeSingleHitDamage(new Decimal(50), 0).toNumber()).toBe(50)
  })
})
