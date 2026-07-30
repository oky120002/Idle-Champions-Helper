import { describe, expect, it } from 'vitest'
import { mergeSpecializationOverrides } from './specializationSelection'
import { createOwnedHero, createUserProfileSnapshot } from '../../domain/user-profile/fixtures'

function specOf(snapshot: { ownedHeroes: { heroId: string; specializations: string[] }[] }, heroId: string) {
  return snapshot.ownedHeroes.find((hero) => hero.heroId === heroId)?.specializations
}

describe('mergeSpecializationOverrides', () => {
  it('无 snapshot → null', () => {
    expect(mergeSpecializationOverrides(null, { '7': ['109'] })).toBeNull()
  })

  it('无 override → 原样返回（同引用，避免 engine 无谓重算）', () => {
    const snap = createUserProfileSnapshot({
      ownedHeroes: [createOwnedHero({ heroId: '7', specializations: ['109'] })],
    })
    expect(mergeSpecializationOverrides(snap, {})).toBe(snap)
  })

  it('override 覆盖 specializations；未 override 的英雄保持存档值与原引用', () => {
    const hero7 = createOwnedHero({ heroId: '7', specializations: ['109'] })
    const hero88 = createOwnedHero({ heroId: '88', specializations: ['6838'] })
    const snap = createUserProfileSnapshot({ ownedHeroes: [hero7, hero88] })
    const merged = mergeSpecializationOverrides(snap, { '88': ['6840', '6978'] })
    expect(merged).not.toBe(snap)
    expect(merged).not.toBeNull()
    const byId = new Map(merged!.ownedHeroes.map((hero) => [hero.heroId, hero]))
    expect(byId.get('7')).toBe(hero7)
    expect(byId.get('7')?.specializations).toEqual(['109'])
    expect(byId.get('88')?.specializations).toEqual(['6840', '6978'])
  })

  it('override 为空数组 = 显式选「无专精」（区别于未 override 的存档值）', () => {
    const snap = createUserProfileSnapshot({
      ownedHeroes: [createOwnedHero({ heroId: '7', specializations: ['109'] })],
    })
    const merged = mergeSpecializationOverrides(snap, { '7': [] })
    expect(merged).not.toBeNull()
    expect(specOf(merged!, '7')).toEqual([])
  })

  it('不修改原 snapshot（不可变）', () => {
    const snap = createUserProfileSnapshot({
      ownedHeroes: [createOwnedHero({ heroId: '7', specializations: ['109'] })],
    })
    mergeSpecializationOverrides(snap, { '7': ['108'] })
    expect(specOf(snap, '7')).toEqual(['109'])
  })

  it('override 的英雄不在 snapshot 中 → 同引用返回（无实际变更）', () => {
    const snap = createUserProfileSnapshot({ ownedHeroes: [createOwnedHero({ heroId: '7' })] })
    expect(mergeSpecializationOverrides(snap, { '999': ['x'] })).toBe(snap)
  })
})
