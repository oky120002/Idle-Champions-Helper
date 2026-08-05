import { describe, expect, it } from 'vitest'

import { computeUltUptime, foldUltBuffValue } from './ultUptime'

describe('computeUltUptime', () => {
  it('uptime = duration / base_cooldown（modron 满级自动施放）', () => {
    // ability 4: duration 30, base_cooldown 900 → 30/900 = 1/30
    expect(computeUltUptime(30, 900, true)).toBeCloseTo(30 / 900, 6)
  })

  it('modron 未激活 → uptime = 0（保守不计 ult buff）', () => expect(computeUltUptime(30, 900, false)).toBe(0))

  it('duration = 0（瞬时 ult）→ uptime = 0', () => expect(computeUltUptime(0, 3600, true)).toBe(0))

  it('uptime 上限 1（duration ≥ cooldown 时满覆盖）', () => expect(computeUltUptime(100, 50, true)).toBe(1))

  it('base_cooldown 缺失/非法 → 0（无法折算）', () => {
    expect(computeUltUptime(30, 0, true)).toBe(0)
    expect(computeUltUptime(30, NaN, true)).toBe(0)
  })
})

describe('foldUltBuffValue', () => {
  it('ult buff 有效值 = value × uptime', () => {
    // Commander global_dps +100%, uptime 1/30 → 有效 +3.33%
    expect(foldUltBuffValue(100, 30 / 900)).toBeCloseTo(100 * 30 / 900, 5)
  })

  it('uptime = 0 → 有效值 0（不计入）', () => expect(foldUltBuffValue(100, 0)).toBe(0))
})
