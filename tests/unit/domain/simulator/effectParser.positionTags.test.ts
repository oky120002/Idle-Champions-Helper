import { describe, expect, it } from 'vitest'
import { parseEffect } from '../../../../src/domain/simulator/effectParser'

describe('effect parser position and tags group', () => {
  it('解析 adjacent target hints', () => {
    const result = parseEffect('adjacent_dps_multiplier_mult', '1.5')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.kind).toBe('adjacentBuff')
      expect(result.value).toBeCloseTo(1.5)
    }
  })

  it('解析 tagged champion multiplier hints', () => {
    const result = parseEffect('tag_hero_dps_mult', '2.0')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.kind).toBe('taggedChampionBuff')
      expect(result.value).toBeCloseTo(2.0)
    }
  })

  it('不支持的位置格式保留解释', () => {
    const result = parseEffect('diagonal_dps_mult', '1.2')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('unsupported')
      expect(result.rawEffect).toBe('diagonal_dps_mult')
      expect(result.note).toContain('diagonal_dps_mult')
    }
  })
})
