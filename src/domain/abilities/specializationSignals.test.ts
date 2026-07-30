import { describe, expect, it } from 'vitest'
import {
  applySpecializationsToProfile,
  selectSpecializationSignals,
  type SpecializationEntry,
} from './specializationSignals'
import type { HeroAbilitySignal, ResolvedHeroAbilityProfile } from './abilityModel'

// 明斯克偏好敌人风格：vulnerability 维度（supportSignals bucket，全局生效）
const heroSpecs: SpecializationEntry[] = [
  {
    upgradeId: '109',
    specializationName: { original: 'Favored Enemy: Beasts', display: '偏好敌人：兽类' },
    signals: [{ dimension: 'vulnerability', bucket: 'supportSignals', signal: { kind: 'enemyVulnerability', value: 300, rawEffect: 'monster_with_tag_more_damage,300,beast', source: 'official-parsed', monsterTags: ['beast'] } }],
  },
  {
    upgradeId: '108',
    specializationName: { original: 'Favored Enemy: Humanoids', display: '偏好敌人：类人生物' },
    signals: [{ dimension: 'vulnerability', bucket: 'supportSignals', signal: { kind: 'enemyVulnerability', value: 300, rawEffect: 'monster_with_tag_more_damage,300,humanoid', source: 'official-parsed', monsterTags: ['humanoid'] } }],
  },
]

// 自增益专精（hero_dps 无目标 → carrySignals bucket）：仅自走 carry 时计入，不得泄漏给其他 carry。
const selfBuffSpecs: SpecializationEntry[] = [
  {
    upgradeId: '201',
    specializationName: { original: 'Self DPS', display: '自身伤害' },
    signals: [{ dimension: 'damage', bucket: 'carrySignals', signal: { kind: 'heroDpsMultiplier', value: 400, rawEffect: 'hero_dps_multiplier_mult,400', source: 'official-parsed' } }],
  },
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

// 带 base 支援信号的 profile（模拟真实英雄：ability 源全队增益已存在）。
const makeProfileWithBaseSupport = (heroId: string): ResolvedHeroAbilityProfile =>
  ({
    ...makeProfile(heroId),
    supportSignals: [BASE_SUPPORT],
    sourceBreakdown: { carrySignals: [], supportSignals: ['official-parsed'], unsupportedSignals: [] },
  } as unknown as ResolvedHeroAbilityProfile)

describe('selectSpecializationSignals', () => {
  it('选玩家已选 upgradeId 的 signal（按 upgradeId 过滤）', () => {
    const s = selectSpecializationSignals(['109'], heroSpecs)
    expect(s).toHaveLength(1)
    expect(s[0]?.kind).toBe('enemyVulnerability')
    expect(s[0]?.monsterTags).toEqual(['beast'])
  })

  it('不做 dimension 过滤——vulnerability 维度 signal 照常返回（与 feat 不同）', () => {
    const s = selectSpecializationSignals(['109', '108'], heroSpecs)
    expect(s).toHaveLength(2)
  })

  it('仅选中项；未选 upgradeId 不注入', () => {
    expect(selectSpecializationSignals(['108'], heroSpecs).map((x) => x.monsterTags)).toEqual([['humanoid']])
    expect(selectSpecializationSignals(['999'], heroSpecs)).toEqual([])
  })

  it('无 catalog → 空', () => {
    expect(selectSpecializationSignals(['109'], undefined)).toEqual([])
  })
})

describe('applySpecializationsToProfile', () => {
  it('注入选中专精 signal（支援/全局 → supportSignals bucket）', () => {
    const profile = applySpecializationsToProfile(makeProfile('7'), ['109'], heroSpecs)
    expect(profile.supportSignals).toHaveLength(1)
    expect(profile.supportSignals[0]?.kind).toBe('enemyVulnerability')
  })

  it('无 active 专精 → 原样（不建空 patch）', () => {
    const original = makeProfile('7')
    expect(applySpecializationsToProfile(original, ['999'], heroSpecs)).toBe(original)
  })

  it('gainProfile 重算（appendHeroAbilitySignals 保证）', () => {
    const profile = applySpecializationsToProfile(makeProfile('7'), ['109'], heroSpecs)
    expect(profile.gainProfile).toBeDefined()
  })

  it('【P0 回归】追加而非替换——base 支援信号必须保留', () => {
    // 误用 applyHeroAbilityPatch 传子集会把 base 35 个支援信号抹成仅专精信号（35→2）。
    const profile = applySpecializationsToProfile(makeProfileWithBaseSupport('7'), ['109', '108'], heroSpecs)
    // base globalDps + 2 个 vulnerability 专精 = 3 个 supportSignals（base 不丢）
    expect(profile.supportSignals).toHaveLength(3)
    expect(profile.supportSignals.map((s) => s.rawEffect)).toContain('global_dps_multiplier_mult,200')
  })

  it('【泄漏回归】自增益专精进 carrySignals（不泄漏到 supportSignals）', () => {
    // hero_dps_multiplier_mult,400 无目标 → carrySignals。注入 supportSignals 会泄漏给其他 carry。
    const profile = applySpecializationsToProfile(makeProfileWithBaseSupport('7'), ['201'], selfBuffSpecs)
    expect(profile.carrySignals).toHaveLength(1)
    expect(profile.carrySignals[0]?.kind).toBe('heroDpsMultiplier')
    // supportSignals 只有 base，未被自增益污染
    expect(profile.supportSignals).toHaveLength(1)
    expect(profile.supportSignals[0]?.rawEffect).toBe('global_dps_multiplier_mult,200')
  })
})
