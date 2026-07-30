import { describe, expect, it } from 'vitest'
import { applyFeatsToProfile, selectFeatSignals, type FeatEntry } from './featSignals'
import type { HeroAbilitySignal, ResolvedHeroAbilityProfile } from './abilityModel'

const heroFeats: FeatEntry[] = [
  // hero_dps 自增益 → carrySignals（仅自走 carry 时计入，不泄漏给其他 carry）
  { id: '35', rarity: 2, signals: [{ dimension: 'damage', bucket: 'carrySignals', signal: { kind: 'heroDpsMultiplier', value: 30, rawEffect: 'hero_dps_multiplier_mult,30', source: 'official-parsed' } }] },
  // global_dps 全队 → supportSignals
  { id: '38', rarity: 2, signals: [{ dimension: 'damage', bucket: 'supportSignals', signal: { kind: 'globalDpsMultiplier', value: 10, rawEffect: 'global_dps_multiplier_mult,10', source: 'official-parsed' } }] },
  { id: '1', rarity: 3, signals: [{ dimension: 'gold', bucket: 'supportSignals', signal: { kind: 'globalGoldMultiplier', value: 25, rawEffect: 'gold_multiplier_mult,25', source: 'official-parsed' } }] },
]

const BASE_SUPPORT: HeroAbilitySignal = {
  kind: 'globalDpsMultiplier',
  value: 200,
  rawEffect: 'global_dps_multiplier_mult,200',
  source: 'official-parsed',
}

const makeProfile = (heroId: string): ResolvedHeroAbilityProfile =>
  ({
    heroId,
    carrySignals: [],
    supportSignals: [],
    unsupportedSignals: [],
    sourceBreakdown: { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
  } as unknown as ResolvedHeroAbilityProfile)

const makeProfileWithBaseSupport = (heroId: string): ResolvedHeroAbilityProfile =>
  ({
    ...makeProfile(heroId),
    supportSignals: [BASE_SUPPORT],
    sourceBreakdown: { carrySignals: [], supportSignals: ['official-parsed'], unsupportedSignals: [] },
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
  it('按 bucket 路由：自增益→carrySignals，全局→supportSignals', () => {
    const profile = applyFeatsToProfile(makeProfile('7'), ['35', '38'], heroFeats)
    // feat 35 heroDps 自增益 → carry；feat 38 globalDps → support
    expect(profile.carrySignals.map((s) => s.kind)).toEqual(['heroDpsMultiplier'])
    expect(profile.supportSignals.map((s) => s.kind)).toEqual(['globalDpsMultiplier'])
  })

  it('按 dimension 过滤（damage）', () => {
    const profile = applyFeatsToProfile(makeProfile('7'), ['35', '1'], heroFeats, 'damage')
    // feat 1 gold 被过滤；feat 35 damage heroDps → carrySignals
    expect(profile.carrySignals).toHaveLength(1)
    expect(profile.carrySignals[0]?.kind).toBe('heroDpsMultiplier')
    expect(profile.supportSignals).toHaveLength(0)
  })

  it('无 active feat signal → 原样（不建空 patch）', () => {
    const original = makeProfile('7')
    expect(applyFeatsToProfile(original, ['999'], heroFeats)).toBe(original)
  })

  it('gainProfile 重算（appendHeroAbilitySignals 保证）', () => {
    const profile = applyFeatsToProfile(makeProfile('7'), ['35'], heroFeats)
    expect(profile.gainProfile).toBeDefined()
  })

  it('【P0 回归】追加而非替换——base 支援信号必须保留', () => {
    // 误用 applyHeroAbilityPatch 传子集会抹掉 base 支援信号（如 ability 源全队 +200%）。
    const profile = applyFeatsToProfile(makeProfileWithBaseSupport('7'), ['38'], heroFeats, 'damage')
    // base globalDps + feat 38 globalDps = 2 个 supportSignals（base 不丢）
    expect(profile.supportSignals).toHaveLength(2)
    expect(profile.supportSignals.map((s) => s.rawEffect)).toContain('global_dps_multiplier_mult,200')
  })
})
