import { describe, expect, it } from 'vitest'
import { parseGameNumber } from '../../../../src/domain/simulator/gameNumber'
import {
  compareGameNumbers,
  divideGameNumbers,
  log10GameNumber,
  multiplyGameNumbers,
  powerGameNumber,
  sortGameNumbers,
} from '../../../../src/domain/simulator/gameNumberArithmetic'

function gn(input: string) {
  const result = parseGameNumber(input)
  if (!result.ok) throw new Error(`parse failed: ${result.error}`)
  return result.value
}

describe('game number arithmetic', () => {
  it('1.5e92 * 2.72e75 在数量级上接近 4.08e167', () => {
    const a = gn('1.5e92')
    const b = gn('2.72e75')
    const product = multiplyGameNumbers(a, b)

    // exponent should be ~167 (92 + 75 = 167)
    expect(product.e).toBe(167)
    // mantissa should be close to 4.08
    expect(product.m).toBeCloseTo(4.08, 1)
  })

  it('除法保持预期排序', () => {
    const a = gn('1e100')
    const b = gn('1e50')
    const quotient = divideGameNumbers(a, b)

    // 1e100 / 1e50 = 1e50
    expect(quotient.e).toBe(50)
  })

  it('幂运算保持预期排序', () => {
    const base = gn('1e10')
    const result = powerGameNumber(base, 2)

    // (1e10)^2 = 1e20
    expect(result.e).toBe(20)
  })

  it('log10 返回正确的指数', () => {
    const value = gn('1e100')
    const log = log10GameNumber(value)

    expect(log).toBeCloseTo(100, 0)
  })

  it('compareGameNumbers 正确比较大小', () => {
    const small = gn('1e50')
    const big = gn('1e100')

    expect(compareGameNumbers(small, big)).toBeLessThan(0)
    expect(compareGameNumbers(big, small)).toBeGreaterThan(0)
    expect(compareGameNumbers(small, gn('1e50'))).toBe(0)
  })

  it('超大值列表排序稳定且确定', () => {
    const values = [gn('1e200'), gn('1e50'), gn('1e100'), gn('1e300'), gn('1e150')]
    const sorted = sortGameNumbers(values)

    const exponents = sorted.map((v) => v.e)
    expect(exponents).toEqual([50, 100, 150, 200, 300])
  })

  it('乘以 0 返回 0', () => {
    const a = gn('1e100')
    const zero = gn('0')
    const product = multiplyGameNumbers(a, zero)

    expect(product.eq(0)).toBe(true)
  })
})
