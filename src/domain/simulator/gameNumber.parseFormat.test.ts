import { describe, expect, it } from 'vitest'
import {
  formatGameNumber,
  parseGameNumber,
} from './gameNumber'

describe('parseGameNumber', () => {
  it('parses "0" to a valid zero value', () => {
    const result = parseGameNumber('0')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.toString()).toBe('0')
  })

  it('parses "1.50e92" preserving the scientific notation value', () => {
    const result = parseGameNumber('1.50e92')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // 用 wrapper formatGameNumber 验证往返（输出可控、库无关）
    expect(formatGameNumber(result.value)).toBe('1.50e92')
  })

  it('parses "4.08e167" preserving the scientific notation value', () => {
    const result = parseGameNumber('4.08e167')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(formatGameNumber(result.value)).toBe('4.08e167')
  })

  it('parses "1e1000" which exceeds Number.MAX_VALUE', () => {
    const result = parseGameNumber('1e1000')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.gt(Number.MAX_VALUE)).toBe(true)
  })

  it('parses game-source non-normalized notation like "56e318"', () => {
    // raw definitions 携带非归一化科学计数法（mantissa 不限 [1,10)）：56e318 = 5.6e319。
    const result = parseGameNumber('56e318')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(formatGameNumber(result.value)).toBe('5.60e319')
  })

  it('parses uppercase-E notation like "8.69E78"', () => {
    const result = parseGameNumber('8.69E78')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(formatGameNumber(result.value)).toBe('8.69e78')
  })

  it('parses numeric input (number type)', () => {
    const result = parseGameNumber(42)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.toNumber()).toBe(42)
  })

  it('returns error for empty string', () => {
    const result = parseGameNumber('')
    expect(result.ok).toBe(false)
  })

  it('returns error for non-numeric string', () => {
    const result = parseGameNumber('hello')
    expect(result.ok).toBe(false)
  })

  it('returns error for NaN input', () => {
    const result = parseGameNumber(Number.NaN)
    expect(result.ok).toBe(false)
  })

  it('returns error for Infinity input', () => {
    const result = parseGameNumber(Number.POSITIVE_INFINITY)
    expect(result.ok).toBe(false)
  })
})

describe('formatGameNumber', () => {
  it('formats zero as "0"', () => {
    const result = parseGameNumber('0')
    if (!result.ok) return
    expect(formatGameNumber(result.value)).toBe('0')
  })

  it('formats small integers without scientific notation', () => {
    const result = parseGameNumber(42)
    if (!result.ok) return
    expect(formatGameNumber(result.value)).toBe('42')
  })

  it('formats values below Number.MAX_VALUE with standard notation', () => {
    const result = parseGameNumber('1.50e92')
    if (!result.ok) return
    const formatted = formatGameNumber(result.value)
    expect(formatted).toContain('1.50')
    expect(formatted).toContain('92')
  })

  it('formats values exceeding Number.MAX_VALUE with game-style notation', () => {
    const result = parseGameNumber('1e1000')
    if (!result.ok) return
    const formatted = formatGameNumber(result.value)
    expect(formatted).not.toBe('Infinity')
    expect(formatted.length).toBeGreaterThan(0)
    expect(formatted).toContain('e')
  })

  it('formats extremely large values beyond simple scientific notation', () => {
    // 1e1000000 - a value that exceeds even simple scientific notation representation
    const result = parseGameNumber('1e1000000')
    if (!result.ok) return
    const formatted = formatGameNumber(result.value)
    expect(formatted).not.toBe('Infinity')
    expect(formatted.length).toBeGreaterThan(0)
  })

  it('respects decimalPlaces option', () => {
    const result = parseGameNumber('1.50e92')
    if (!result.ok) return
    const formatted = formatGameNumber(result.value, { decimalPlaces: 4 })
    expect(formatted).toContain('1.5000')
  })
})
