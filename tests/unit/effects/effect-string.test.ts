import { describe, expect, it } from 'vitest'

import { parseEffectPayload } from '../../../src/domain/effects/effect-string.js'

describe('parseEffectPayload', () => {
  it('非 JSON 串按逗号分割为 kind + args', () => {
    const payload = parseEffectPayload('hero_dps_multiplier_mult,100')

    expect(payload?.kind).toBe('hero_dps_multiplier_mult')
    expect(payload?.effectString).toBe('hero_dps_multiplier_mult,100')
    expect(payload?.args).toEqual(['100'])
  })

  it('合法 JSON-string 提取内部 effect_string 作为 effectString', () => {
    // 真实数据模式：upgrade.effectReference 是 JSON 对象字符串，
    // 内含 effect_string + description。effectString 必须取内部值，不能用外层 JSON 串。
    const payload = parseEffectPayload('{"effect_string":"buff_upgrade,100,4","description":"x"}')

    expect(payload?.kind).toBe('buff_upgrade')
    expect(payload?.effectString).toBe('buff_upgrade,100,4')
    expect(payload?.args).toEqual(['100', '4'])
  })

  it('malformed JSON（字段间缺逗号）通过 effect_string 正则兜底恢复', () => {
    // 真实数据（如 hero 61 Jaheira）：effectReference 是缺逗号的 malformed JSON，
    // JSON.parse 失败。正则兜底提取 effect_string，避免信号丢失。
    const malformed = '{"effect_string":"buff_upgrades,100,4,5"\n"description":"missing comma"}'

    const payload = parseEffectPayload(malformed)

    expect(payload?.kind).toBe('buff_upgrades')
    expect(payload?.effectString).toBe('buff_upgrades,100,4,5')
    expect(payload?.args).toEqual(['100', '4', '5'])
  })

  it('非法 kind（数字开头）仍返回 null', () => {
    expect(parseEffectPayload('123_bad,100')).toBeNull()
    expect(parseEffectPayload('{"effect_string":"123_bad,100"}')).toBeNull()
  })

  it('空串与纯空白返回 null', () => {
    expect(parseEffectPayload('')).toBeNull()
    expect(parseEffectPayload('   ')).toBeNull()
  })
})
