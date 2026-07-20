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

  it('CNE effect 字段串字段间缺逗号（伪 JSON）时正则兜底恢复 effect_string', () => {
    // 数据源格式特性（非 bug）：CNE 官方 API 的 upgrade_defines.effect 序列化不稳定，
    // 357 条对象串中 19 条 effect_string 行末缺逗号，JSON.parse 失败。游戏引擎用自己的
    // 解析器照常运行，但我们用 JSON.parse 会丢信号。正则直接提取 effect_string 覆盖两种形态。
    // 见 AGENTS.md「数据源格式追溯」守则。
    const cnePseudoJson = '{"effect_string":"buff_upgrades,100,4,5"\n"description":"missing comma"}'

    const payload = parseEffectPayload(cnePseudoJson)

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
