import { describe, expect, it } from 'vitest'
import { parseEffectPayload } from '../../src/domain/effects/effect-string'
import { normalizeEffectSignal, parseBaseCritChancePercent } from './effect-helpers'

describe('normalizeEffectSignal · vulnerability', () => {
  it('monster_with_tag_more_damage → enemyVulnerability（tag 动态 args[1]）', () => {
    const payload = parseEffectPayload('monster_with_tag_more_damage,300,beast')
    const r = normalizeEffectSignal('monster_with_tag_more_damage', '300', 'official-parsed', { effectPayload: payload })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.signal.kind).toBe('enemyVulnerability')
    expect(r.signal.value).toBe(300)
    expect(r.signal.monsterTags).toEqual(['beast'])
  })

  it('monster_with_tag_more_damage 多 tag（| 为 OR）', () => {
    const payload = parseEffectPayload('monster_with_tag_more_damage,300,beast|humanoid')
    const r = normalizeEffectSignal('monster_with_tag_more_damage', '300', 'official-parsed', { effectPayload: payload })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.signal.kind).toBe('enemyVulnerability')
    expect(r.signal.monsterTags).toEqual(['beast', 'humanoid'])
  })

  it('increase_damage_against_monster_tag 仍工作（回归）', () => {
    const payload = parseEffectPayload('increase_damage_against_monster_tag,200,undead')
    const r = normalizeEffectSignal('increase_damage_against_monster_tag', '200', 'official-parsed', { effectPayload: payload })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.signal.kind).toBe('enemyVulnerability')
    expect(r.signal.monsterTags).toEqual(['undead'])
  })
})

describe('parseBaseCritChancePercent · set_base_crit_chance stat 提取', () => {
  it('set_base_crit_chance,20 → 20（英雄 innate base crit % 覆盖默认 2.5%）', () => expect(parseBaseCritChancePercent('set_base_crit_chance', '20')).toBe(20))

  it('非 base-stat effect → null（不误抓其他 effect）', () => {
    expect(parseBaseCritChancePercent('hero_dps_multiplier_mult', '50')).toBeNull()
    expect(parseBaseCritChancePercent('global_crit_chance', '100')).toBeNull()
  })

  it('非数值 → null（不产出 NaN）', () => expect(parseBaseCritChancePercent('set_base_crit_chance', 'abc')).toBeNull())
})
