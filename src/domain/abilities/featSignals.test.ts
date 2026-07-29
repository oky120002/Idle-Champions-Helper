import { describe, expect, it } from 'vitest'
import { applyFeatsToProfile, selectFeatSignals, type FeatEntry } from './featSignals'
import type { ResolvedHeroAbilityProfile } from './abilityModel'

const heroFeats: FeatEntry[] = [
  { id: '35', rarity: 2, signals: [{ dimension: 'damage', signal: { kind: 'heroDpsMultiplier', value: 30, rawEffect: 'hero_dps_multiplier_mult,30', source: 'official-parsed' } }] },
  { id: '38', rarity: 2, signals: [{ dimension: 'damage', signal: { kind: 'globalDpsMultiplier', value: 10, rawEffect: 'global_dps_multiplier_mult,10', source: 'official-parsed' } }] },
  { id: '1', rarity: 3, signals: [{ dimension: 'gold', signal: { kind: 'globalGoldMultiplier', value: 25, rawEffect: 'gold_multiplier_mult,25', source: 'official-parsed' } }] },
]

const makeProfile = (heroId: string): ResolvedHeroAbilityProfile =>
  ({
    heroId,
    carrySignals: [],
    supportSignals: [],
    unsupportedSignals: [],
    sourceBreakdown: { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
  } as unknown as ResolvedHeroAbilityProfile)

describe('selectFeatSignals', () => {
  it('选 active feat 的 signal（按 id 过滤）', () => {
    const s = selectFeatSignals(['35', '38'], heroFeats)
    expect(s).toHaveLength(2)
    expect(s.map((x) => x.kind)).toEqual(['heroDpsMultiplier', 'globalDpsMultiplier'])
  })

  it('按 dimension 过滤（damage only）', () => {
    const s = selectFeatSignals(['35', '1'], heroFeats, 'damage')
    expect(s).toHaveLength(1) // feat 1 gold 被过滤
    expect(s[0]?.kind).toBe('heroDpsMultiplier')
  })

  it('非 active feat 不选', () => {
    expect(selectFeatSignals(['999'], heroFeats)).toEqual([])
  })

  it('无 featCatalog → 空', () => {
    expect(selectFeatSignals(['35'], undefined)).toEqual([])
  })
})

describe('applyFeatsToProfile', () => {
  it('注入 active feat signal 到 supportSignals', () => {
    const profile = applyFeatsToProfile(makeProfile('7'), ['35', '38'], heroFeats)
    expect(profile.supportSignals).toHaveLength(2)
    expect(profile.supportSignals.map((s) => s.kind)).toEqual(['heroDpsMultiplier', 'globalDpsMultiplier'])
  })

  it('按 dimension 过滤（damage）', () => {
    const profile = applyFeatsToProfile(makeProfile('7'), ['35', '1'], heroFeats, 'damage')
    expect(profile.supportSignals).toHaveLength(1)
    expect(profile.supportSignals[0]?.kind).toBe('heroDpsMultiplier')
  })

  it('无 active feat signal → 原样（不建空 patch）', () => {
    const original = makeProfile('7')
    expect(applyFeatsToProfile(original, ['999'], heroFeats)).toBe(original)
  })

  it('gainProfile 重算（applyHeroAbilityPatch 保证）', () => {
    const profile = applyFeatsToProfile(makeProfile('7'), ['35'], heroFeats)
    expect(profile.gainProfile).toBeDefined()
  })
})
