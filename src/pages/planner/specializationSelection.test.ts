import { describe, expect, it } from 'vitest'
import { applyTierSelection, groupSpecializationsByTier, mergeSpecializationOverrides } from './specializationSelection'
import type { SpecializationEntry } from '../../domain/abilities/specializationSignals'
import { createOwnedHero, createUserProfileSnapshot } from '../../domain/user-profile/fixtures'

function specOf(snapshot: { ownedHeroes: { heroId: string; specializations: string[] }[] }, heroId: string) {
  return snapshot.ownedHeroes.find((hero) => hero.heroId === heroId)?.specializations
}

function makeEntry(upgradeId: string, requiredLevel: number | null, display = upgradeId): SpecializationEntry {
  return {
    upgradeId,
    specializationName: { original: display, display },
    requiredLevel,
    signals: [{
      dimension: 'damage',
      bucket: 'carrySignals',
      signal: { kind: 'heroDpsMultiplier', value: 40, rawEffect: 'hero_dps_multiplier_mult,40', source: 'official-parsed' },
    }],
  }
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

describe('groupSpecializationsByTier', () => {
  it('按 requiredLevel 分组，升序；组内保持 catalog 原序', () => {
    const tiers = groupSpecializationsByTier([
      makeEntry('109', 50),
      makeEntry('110', 50),
      makeEntry('200', 120),
      makeEntry('201', 20),
    ])
    expect(tiers.map((tier) => tier.requiredLevel)).toEqual([20, 50, 120])
    expect(tiers.find((tier) => tier.requiredLevel === 50)!.entries.map((entry) => entry.upgradeId)).toEqual(['109', '110'])
  })

  it('requiredLevel 缺失（null）归入同一组并排在末尾', () => {
    const tiers = groupSpecializationsByTier([
      makeEntry('a', null),
      makeEntry('b', 50),
      makeEntry('c', null),
    ])
    expect(tiers.map((tier) => tier.requiredLevel)).toEqual([50, null])
    expect(tiers.find((tier) => tier.requiredLevel === null)!.entries.map((entry) => entry.upgradeId)).toEqual(['a', 'c'])
  })

  it('空 → 空', () => {
    expect(groupSpecializationsByTier([])).toEqual([])
  })
})

describe('applyTierSelection', () => {
  const tier = ['108', '109', '110']

  it('选本层一个：移除本层其它、加入选中，保留其它层选择', () => {
    expect(applyTierSelection(['109', '200'], tier, '110')).toEqual(['200', '110'])
  })

  it('selected=null（选「无」）：仅移除本层，不加入', () => {
    expect(applyTierSelection(['109', '200'], tier, null)).toEqual(['200'])
  })

  it('当前不含本层 id 时选一个 → 加入', () => {
    expect(applyTierSelection(['200'], tier, '109')).toEqual(['200', '109'])
  })

  it('selected 不在本层 id 集合内（防御）→ 仍加入', () => {
    expect(applyTierSelection(['200'], tier, '999')).toEqual(['200', '999'])
  })
})
