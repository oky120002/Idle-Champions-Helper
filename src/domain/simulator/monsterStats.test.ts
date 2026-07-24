import Decimal from 'break_eternity.js'
import { describe, expect, test } from 'vitest'

import {
  MAX_AREA,
  monsterDpsAt,
  monsterHealthAt,
} from './monsterStats'
import { compareGameNumbers } from './gameNumberArithmetic'

describe('monsterHealthAt', () => {
  test('area 1 = base_health', () => {
    expect(monsterHealthAt(1).eq(10)).toBe(true)
  })

  test('area 2 = base × rate (2.031)', () => {
    expect(monsterHealthAt(2).eq(new Decimal(10).times(2.031))).toBe(true)
  })

  test('area 50 = base × 2.031^49', () => {
    expect(monsterHealthAt(50).eq(new Decimal(10).times(Decimal.pow(2.031, 49)))).toBe(true)
  })

  test('grows monotonically with area', () => {
    const prev = monsterHealthAt(100)
    const next = monsterHealthAt(101)
    expect(compareGameNumbers(next, prev)).toBeGreaterThan(0)
  })

  test('area > 2000 uses higher growth rate (3.031 segment)', () => {
    // 跨段：area 2001 增长率从 2.031 跳到 3.031
    const a2000 = monsterHealthAt(2000)
    const a2001 = monsterHealthAt(2001)
    const ratio = a2001.div(a2000).toNumber()
    expect(ratio).toBeCloseTo(3.031, 2)
  })

  test('high area exceeds double range (needs break_eternity)', () => {
    // area 1000 HP ~10^308，逼近 double 上界；必须用 Decimal
    const hp = monsterHealthAt(1000)
    expect(hp.layer).toBeGreaterThanOrEqual(1)
  })
})

describe('monsterDpsAt', () => {
  test('area 1 = base_dps', () => {
    expect(monsterDpsAt(1).eq(1)).toBe(true)
  })

  test('non-boss area (1-49) stays at base_dps', () => {
    expect(monsterDpsAt(49).eq(1)).toBe(true)
  })

  test('boss area 50 = 1.75× spike', () => {
    expect(monsterDpsAt(50).eq(1.75)).toBe(true)
  })

  test('area 100 = 1.75² (two boss areas passed)', () => {
    const dps = monsterDpsAt(100)
    const expected = new Decimal(1.75).pow(2)
    // 数值容差比较（break_eternity 重复 times 与 pow 内部表示微差）。
    const ratio = dps.div(expected).toNumber()
    expect(ratio).toBeCloseTo(1, 10)
  })

  test('低层第 3 个 boss spike 在 151（非 150）：raw dps_growth_rate_curve 精确序列', () => {
    // raw 序列 50,100,151,201,...——area 150 只过 2 个 spike（1.75²），151 才过第 3 个（1.75³）。
    const dps150 = monsterDpsAt(150)
    const dps151 = monsterDpsAt(151)
    expect(dps150.div(new Decimal(1.75).pow(2)).toNumber()).toBeCloseTo(1, 10)
    expect(dps151.div(new Decimal(1.75).pow(3)).toNumber()).toBeCloseTo(1, 10)
    // 150→151 正好在 boss spike 处跳 ×1.75
    expect(dps151.div(dps150).toNumber()).toBeCloseTo(1.75, 10)
  })

  test('area 2451 includes the 1e10 wall', () => {
    const dps = monsterDpsAt(2451)
    // 1e10 wall at 2451: dps must be enormous
    expect(compareGameNumbers(dps, new Decimal(1e9))).toBeGreaterThan(0)
  })
})

describe('MAX_AREA', () => {
  test('matches game rule max_area', () => {
    expect(MAX_AREA).toBe(2501)
  })
})
