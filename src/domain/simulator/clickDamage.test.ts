import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'

import { computeClickDamage, DEFAULT_CLICK_SECONDS } from './clickDamage'

describe('computeClickDamage', () => {
  it('click damage = BUD × clickSeconds', () => {
    const bud = new Decimal(1000)
    expect(computeClickDamage(bud, 2).eq(2000)).toBe(true)
  })

  it('clickSeconds 缺省用 DEFAULT_CLICK_SECONDS', () => {
    const bud = new Decimal(100)
    expect(computeClickDamage(bud).eq(bud.mul(DEFAULT_CLICK_SECONDS))).toBe(true)
  })

  it('BUD 为 0 → click damage 0', () => {
    expect(computeClickDamage(new Decimal(0), 5).eq(0)).toBe(true)
  })

  it('更高 BUD → 更高 click damage（保序）', () => {
    const low = computeClickDamage(new Decimal(10), 1)
    const high = computeClickDamage(new Decimal(100), 1)
    expect(high.gt(low)).toBe(true)
  })
})
