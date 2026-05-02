import { describe, expect, it } from 'vitest'
import { parseGameNumber } from '../../../../src/domain/simulator/gameNumber'
import {
  ADDITION_EXPONENT_THRESHOLD,
  addGameNumbers,
} from '../../../../src/domain/simulator/gameNumberAddition'

function gn(input: string) {
  const result = parseGameNumber(input)
  if (!result.ok) throw new Error(`parse failed: ${result.error}`)
  return result.value
}

describe('game number addition threshold', () => {
  it('1e100 + 1e99 会改变显示尾数', () => {
    const a = gn('1e100')
    const b = gn('1e99')

    const result = addGameNumbers(a, b)

    // 1e100 + 1e99 = 1.1e100 — mantissa changes
    expect(result.m).toBeCloseTo(1.1, 1)
    expect(result.e).toBe(100)
  })

  it('1e100 + 1e80 在显示和排序上返回较大项', () => {
    const a = gn('1e100')
    const b = gn('1e80')

    const result = addGameNumbers(a, b)

    // The difference is 20 orders of magnitude, beyond threshold
    // Result should be essentially 1e100
    expect(result.e).toBe(100)
    expect(result.m).toBeCloseTo(1.0, 1)
  })

  it('ADDITION_EXPONENT_THRESHOLD 集中定义', () => {
    expect(typeof ADDITION_EXPONENT_THRESHOLD).toBe('number')
    expect(ADDITION_EXPONENT_THRESHOLD).toBeGreaterThan(0)
  })

  it('刚好在阈值边界上的加法被忽略', () => {
    const threshold = ADDITION_EXPONENT_THRESHOLD
    const a = gn('1e100')
    const b = gn(`1e${100 - threshold}`)

    const result = addGameNumbers(a, b)

    // At the threshold boundary, the smaller term is dropped
    expect(result.e).toBe(100)
    expect(result.m).toBe(1.0)
  })

  it('阈值以内的加法仍影响结果', () => {
    const a = gn('1e100')
    const b = gn('1e99')

    const result = addGameNumbers(a, b)

    expect(result.e).toBe(100)
    expect(result.m).toBeCloseTo(1.1, 0)
  })

  it('两个相等值相加翻倍', () => {
    const a = gn('1e50')

    const result = addGameNumbers(a, a)

    expect(result.m).toBeCloseTo(2.0, 1)
    expect(result.e).toBe(50)
  })
})
