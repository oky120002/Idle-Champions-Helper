import { describe, expect, it } from 'vitest'
import { applyFeatsToProfile, type FeatEntry } from './featSignals'
import type { HeroAbilitySignal, ResolvedHeroAbilityProfile } from './abilityModel'

const heroFeats: FeatEntry[] = [
  // hero_dps 自增益 → carrySignals（仅自走 carry 时计入，不泄漏给其他 carry）
  { id: '35', rarity: 2, signals: [{ dimension: 'damage', bucket: 'carrySignals', signal: { kind: 'heroDpsMultiplier', value: 30, rawEffect: 'hero_dps_multiplier_mult,30', source: 'official-parsed' } }] },
  // global_dps 全队 → supportSignals
  { id: '38', rarity: 2, signals: [{ dimension: 'damage', bucket: 'supportSignals', signal: { kind: 'globalDpsMultiplier', value: 10, rawEffect: 'global_dps_multiplier_mult,10', source: 'official-parsed' } }] },
  // crit 维度 feat（heroCritChance）——carry-dps 评估用 crit 维度，不得被 scoringMode 预过滤丢弃
  { id: 'crit1', rarity: 2, signals: [{ dimension: 'crit', bucket: 'supportSignals', signal: { kind: 'heroCritChance', value: 20, rawEffect: 'buff_base_crit_chance_add,20', source: 'official-parsed' } }] },
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

describe('applyFeatsToProfile', () => {
  it('按 bucket 路由：自增益→carrySignals，全局→supportSignals', () => {
    const profile = applyFeatsToProfile(makeProfile('7'), ['35', '38'], heroFeats)
    expect(profile.carrySignals.map((s) => s.kind)).toEqual(['heroDpsMultiplier'])
    expect(profile.supportSignals.map((s) => s.kind)).toEqual(['globalDpsMultiplier'])
  })

  it('【crit 回归】注入全部维度——crit feat 不被 scoringMode 维度预过滤丢弃', () => {
    // crit 经 computeCritFactor 直接乘进 carryDps；旧实现按 scoringMode 传 dimension='damage'
    // 会过滤掉 crit feat → 永不注入 → 有 crit feat 的英雄系统性低估。与专精同构：不做维度预过滤。
    const profile = applyFeatsToProfile(makeProfile('7'), ['crit1'], heroFeats)
    expect(profile.supportSignals.some((s) => s.kind === 'heroCritChance')).toBe(true)
  })

  it('无 active feat signal → 原样（不建空 patch）', () => {
    const original = makeProfile('7')
    expect(applyFeatsToProfile(original, ['999'], heroFeats)).toBe(original)
  })

  it('无 featCatalog → 原样', () => {
    const original = makeProfile('7')
    expect(applyFeatsToProfile(original, ['35'], undefined)).toBe(original)
  })

  it('gainProfile 重算（appendHeroAbilitySignals 保证）', () => {
    const profile = applyFeatsToProfile(makeProfile('7'), ['35'], heroFeats)
    expect(profile.gainProfile).toBeDefined()
  })

  it('【P0 回归】追加而非替换——base 支援信号必须保留', () => {
    // 误用 applyHeroAbilityPatch 传子集会抹掉 base 支援信号（如 ability 源全队 +200%）。
    const profile = applyFeatsToProfile(makeProfileWithBaseSupport('7'), ['38'], heroFeats)
    // base globalDps + feat 38 globalDps = 2 个 supportSignals（base 不丢）
    expect(profile.supportSignals).toHaveLength(2)
    expect(profile.supportSignals.map((s) => s.rawEffect)).toContain('global_dps_multiplier_mult,200')
  })
})
