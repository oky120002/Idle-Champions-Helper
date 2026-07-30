import { describe, expect, it } from 'vitest'
import {
  applySpecializationsToProfile,
  selectSpecializationSignals,
  type SpecializationEntry,
} from './specializationSignals'
import type { ResolvedHeroAbilityProfile } from './abilityModel'

// 明斯克偏好敌人风格：vulnerability 维度（关键——不做 dimension 过滤，与 feat 不同）
const heroSpecs: SpecializationEntry[] = [
  {
    upgradeId: '109',
    specializationName: { original: 'Favored Enemy: Beasts', display: '偏好敌人：兽类' },
    signals: [{ dimension: 'vulnerability', signal: { kind: 'enemyVulnerability', value: 300, rawEffect: 'monster_with_tag_more_damage,300,beast', source: 'official-parsed', monsterTags: ['beast'] } }],
  },
  {
    upgradeId: '108',
    specializationName: { original: 'Favored Enemy: Humanoids', display: '偏好敌人：类人生物' },
    signals: [{ dimension: 'vulnerability', signal: { kind: 'enemyVulnerability', value: 300, rawEffect: 'monster_with_tag_more_damage,300,humanoid', source: 'official-parsed', monsterTags: ['humanoid'] } }],
  },
]

const makeProfile = (heroId: string): ResolvedHeroAbilityProfile =>
  ({
    heroId,
    carrySignals: [],
    supportSignals: [],
    unsupportedSignals: [],
    sourceBreakdown: { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
  } as unknown as ResolvedHeroAbilityProfile)

describe('selectSpecializationSignals', () => {
  it('选玩家已选 upgradeId 的 signal（按 upgradeId 过滤）', () => {
    const s = selectSpecializationSignals(['109'], heroSpecs)
    expect(s).toHaveLength(1)
    expect(s[0]?.kind).toBe('enemyVulnerability')
    expect(s[0]?.monsterTags).toEqual(['beast'])
  })

  it('不做 dimension 过滤——vulnerability 维度 signal 照常返回（与 feat 不同）', () => {
    // 若像 feat 那样按 damage/gold 过滤，vulnerability 会被排除（明斯克专精失效）
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
  it('注入选中专精 signal 到 supportSignals', () => {
    const profile = applySpecializationsToProfile(makeProfile('7'), ['109'], heroSpecs)
    expect(profile.supportSignals).toHaveLength(1)
    expect(profile.supportSignals[0]?.kind).toBe('enemyVulnerability')
  })

  it('无 active 专精 → 原样（不建空 patch）', () => {
    const original = makeProfile('7')
    expect(applySpecializationsToProfile(original, ['999'], heroSpecs)).toBe(original)
  })

  it('gainProfile 重算（applyHeroAbilityPatch 保证）', () => {
    const profile = applySpecializationsToProfile(makeProfile('7'), ['109'], heroSpecs)
    expect(profile.gainProfile).toBeDefined()
  })
})
