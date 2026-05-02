import { describe, expect, it } from 'vitest'
import { parseEffect } from '../../../../src/domain/simulator/effectParser'

describe('effect parser core DPS group', () => {
  it('解析 global_dps_multiplier_mult', () => {
    const result = parseEffect('global_dps_multiplier_mult', '2.5')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.kind).toBe('globalDpsMultiplier')
      expect(result.value).toBeCloseTo(2.5)
    }
  })

  it('解析 hero_dps_multiplier_mult', () => {
    const result = parseEffect('hero_dps_multiplier_mult', '3.0')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.kind).toBe('heroDpsMultiplier')
      expect(result.value).toBeCloseTo(3.0)
    }
  })

  it('未知 prefix 返回 unsupported result 且不抛错', () => {
    const result = parseEffect('unknown_effect_xyz', '1.0')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('unsupported')
      expect(result.rawEffect).toBe('unknown_effect_xyz')
    }
  })
})
