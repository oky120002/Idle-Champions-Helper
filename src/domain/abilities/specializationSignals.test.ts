import { describe, expect, it } from 'vitest'
import {
  applySpecializationsToProfile,
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

// 现有测试无 requiredLevel → 等级门控跳过（任何等级都通过）
const HIGH_LEVEL = 9999

describe('applySpecializationsToProfile', () => {
  it('注入选中专精 signal（支援/全局 → supportSignals bucket）', () => {
    const profile = applySpecializationsToProfile(makeProfile('7'), ['109'], heroSpecs, HIGH_LEVEL)
    expect(profile.supportSignals).toHaveLength(1)
    expect(profile.supportSignals[0]?.kind).toBe('enemyVulnerability')
  })

  it('无 active 专精 → 原样（不建空 patch）', () => {
    const original = makeProfile('7')
    expect(applySpecializationsToProfile(original, ['999'], heroSpecs, HIGH_LEVEL)).toBe(original)
  })

  it('gainProfile 重算（appendHeroAbilitySignals 保证）', () => {
    const profile = applySpecializationsToProfile(makeProfile('7'), ['109'], heroSpecs, HIGH_LEVEL)
    expect(profile.gainProfile).toBeDefined()
  })

  it('【P0 回归】追加而非替换——base 支援信号必须保留', () => {
    // 误用 applyHeroAbilityPatch 传子集会把 base 35 个支援信号抹成仅专精信号（35→2）。
    const profile = applySpecializationsToProfile(makeProfileWithBaseSupport('7'), ['109', '108'], heroSpecs, HIGH_LEVEL)
    // base globalDps + 2 个 vulnerability 专精 = 3 个 supportSignals（base 不丢）
    expect(profile.supportSignals).toHaveLength(3)
    expect(profile.supportSignals.map((s) => s.rawEffect)).toContain('global_dps_multiplier_mult,200')
  })

  it('【泄漏回归】自增益专精进 carrySignals（不泄漏到 supportSignals）', () => {
    // hero_dps_multiplier_mult,400 无目标 → carrySignals。注入 supportSignals 会泄漏给其他 carry。
    const profile = applySpecializationsToProfile(makeProfileWithBaseSupport('7'), ['201'], selfBuffSpecs, HIGH_LEVEL)
    expect(profile.carrySignals).toHaveLength(1)
    expect(profile.carrySignals[0]?.kind).toBe('heroDpsMultiplier')
    // supportSignals 只有 base，未被自增益污染
    expect(profile.supportSignals).toHaveLength(1)
    expect(profile.supportSignals[0]?.rawEffect).toBe('global_dps_multiplier_mult,200')
  })
})

describe('applySpecializationsToProfile 等级门控', () => {
  const specWithLevel: SpecializationEntry[] = [
    {
      upgradeId: '109',
      specializationName: { original: 'Favored Enemy: Beasts', display: '偏好敌人：兽类' },
      requiredLevel: 150,
      signals: [{ dimension: 'vulnerability', bucket: 'supportSignals', signal: { kind: 'enemyVulnerability', value: 300, rawEffect: 'monster_with_tag_more_damage,300,beast', source: 'official-parsed', monsterTags: ['beast'] } }],
    },
  ]

  it('等级 >= requiredLevel → 注入专精信号', () => {
    const profile = applySpecializationsToProfile(makeProfile('7'), ['109'], specWithLevel, 150)
    expect(profile.supportSignals).toHaveLength(1)
  })

  it('等级 < requiredLevel → 不注入（原样返回）', () => {
    const original = makeProfile('7')
    const profile = applySpecializationsToProfile(original, ['109'], specWithLevel, 100)
    expect(profile).toBe(original)
  })

  it('requiredLevel 为 null → 不门控（总是注入）', () => {
    const specNoLevel: SpecializationEntry[] = [
      {
        upgradeId: '109',
        specializationName: { original: 'Test', display: '测试' },
        requiredLevel: null,
        signals: [{ dimension: 'vulnerability', bucket: 'supportSignals', signal: { kind: 'enemyVulnerability', value: 300, rawEffect: 'monster_with_tag_more_damage,300,beast', source: 'official-parsed', monsterTags: ['beast'] } }],
      },
    ]
    const profile = applySpecializationsToProfile(makeProfile('7'), ['109'], specNoLevel, 1)
    expect(profile.supportSignals).toHaveLength(1)
  })
})

describe('applySpecializationsToProfile 速度效果', () => {
  const specWithSpeed: SpecializationEntry[] = [
    {
      upgradeId: '301',
      specializationName: { original: 'Speed Spec', display: '速度专精' },
      signals: [],
      speedEffects: [{ category: 'spawnSpeed', value: 50, rawEffect: 'spec_spawn_speed' }],
    },
  ]

  it('base + spec 速度效果合并后 speedGain 正确重算（非置 1）', () => {
    const baseProfile = {
      ...makeProfile('7'),
      speedProfile: {
        heroId: '7',
        effects: [{ category: 'spawnSpeed', value: 100, rawEffect: 'base_spawn_speed' }],
        speedGain: 2, // build 期：1 + 100/100
      },
    } as unknown as ResolvedHeroAbilityProfile
    const profile = applySpecializationsToProfile(baseProfile, ['301'], specWithSpeed, HIGH_LEVEL)
    expect(profile.speedProfile).toBeDefined()
    // spawnSpeed 加性：1 + (100+50)/100 = 2.5
    expect(profile.speedProfile?.speedGain).toBe(2.5)
    expect(profile.speedProfile?.effects).toHaveLength(2)
  })

  it('无 base 速度效果注入 spec 速度效果 → speedGain > 1', () => {
    const profile = applySpecializationsToProfile(makeProfile('7'), ['301'], specWithSpeed, HIGH_LEVEL)
    expect(profile.speedProfile).toBeDefined()
    expect(profile.speedProfile?.speedGain).toBe(1.5) // 1 + 50/100
  })
})

describe('applySpecializationsToProfile attackOverrides（change_base_attack 专精覆盖）', () => {
  // 带 attackOverrides 的 profile：baseAttackCooldown=5、numTargets=1（典型单目标英雄）。
  // build 期将专精 change_base_attack 覆盖存入 attackOverrides[keyed by upgradeId]，
  // runtime 激活对应专精时由 applySpecializationsToProfile 应用到 baseAttackCooldown/numTargets。
  const makeProfileWithOverrides = (): ResolvedHeroAbilityProfile => ({
    ...makeProfile('7'),
    baseAttackCooldown: 5,
    numTargets: 1,
    attackOverrides: { spec_cba: { cooldown: 3, numTargets: 5 } },
  })

  // attackOverrides 对应的专精 entry（无 requiredLevel → 无等级门控）
  const specWithCba: SpecializationEntry[] = [
    {
      upgradeId: 'spec_cba',
      specializationName: { original: 'Change Base Attack', display: '变更基础攻击' },
      signals: [],
    },
  ]

  it('激活的专精 attackOverrides 覆盖 base 攻击参数', () => {
    const profile = applySpecializationsToProfile(makeProfileWithOverrides(), ['spec_cba'], specWithCba, HIGH_LEVEL)
    expect(profile.baseAttackCooldown).toBe(3)
    expect(profile.numTargets).toBe(5)
  })

  it('未激活的专精 attackOverrides 不覆盖（base 参数不变）', () => {
    const profile = applySpecializationsToProfile(makeProfileWithOverrides(), [], specWithCba, HIGH_LEVEL)
    expect(profile.baseAttackCooldown).toBe(5)
    expect(profile.numTargets).toBe(1)
  })

  it('等级门控：requiredLevel 高于英雄等级 → 覆盖不生效', () => {
    const specWithLevel: SpecializationEntry[] = [
      {
        upgradeId: 'spec_cba',
        specializationName: { original: 'Change Base Attack', display: '变更基础攻击' },
        requiredLevel: 100,
        signals: [],
      },
    ]
    const profile = applySpecializationsToProfile(makeProfileWithOverrides(), ['spec_cba'], specWithLevel, 50)
    expect(profile.baseAttackCooldown).toBe(5)
    expect(profile.numTargets).toBe(1)
  })
})
