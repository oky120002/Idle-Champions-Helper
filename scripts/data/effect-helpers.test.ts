import { describe, expect, it } from 'vitest'
import { normalizeEffectSignal } from './effect-helpers'
import { parseEffectPayload } from '../../src/domain/effects/effect-string'

describe('normalizeEffectSignal · vulnerability', () => {
  it('monster_with_tag_more_damage → enemyVulnerability（tag 动态 args[1]）', () => {
    const payload = parseEffectPayload('monster_with_tag_more_damage,300,beast')
    const r = normalizeEffectSignal('monster_with_tag_more_damage', '300', 'official-parsed', { effectPayload: payload })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.signal.kind).toBe('enemyVulnerability')
      expect(r.signal.value).toBe(300)
      expect(r.signal.monsterTags).toEqual(['beast'])
    }
  })

  it('monster_with_tag_more_damage 多 tag（| 为 OR）', () => {
    const payload = parseEffectPayload('monster_with_tag_more_damage,300,beast|humanoid')
    const r = normalizeEffectSignal('monster_with_tag_more_damage', '300', 'official-parsed', { effectPayload: payload })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.signal.kind).toBe('enemyVulnerability')
      expect(r.signal.monsterTags).toEqual(['beast', 'humanoid'])
    }
  })

  it('increase_damage_against_monster_tag 仍工作（回归）', () => {
    const payload = parseEffectPayload('increase_damage_against_monster_tag,200,undead')
    const r = normalizeEffectSignal('increase_damage_against_monster_tag', '200', 'official-parsed', { effectPayload: payload })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.signal.kind).toBe('enemyVulnerability')
      expect(r.signal.monsterTags).toEqual(['undead'])
    }
  })
})
