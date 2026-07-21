import { describe, expect, it } from 'vitest'

import { parseEffectPayload } from '../../../src/domain/effects/effect-string.js'

describe('parseEffectPayload', () => {
  it('非 JSON 串按逗号分割为 kind + args', () => {
    const payload = parseEffectPayload('hero_dps_multiplier_mult,100')

    expect(payload?.kind).toBe('hero_dps_multiplier_mult')
    expect(payload?.effectString).toBe('hero_dps_multiplier_mult,100')
    expect(payload?.args).toEqual(['100'])
  })

  it('非法 kind（数字开头）仍返回 null', () => {
    expect(parseEffectPayload('123_bad,100')).toBeNull()
  })

  it('空串与纯空白返回 null', () => {
    expect(parseEffectPayload('')).toBeNull()
    expect(parseEffectPayload('   ')).toBeNull()
  })
})
