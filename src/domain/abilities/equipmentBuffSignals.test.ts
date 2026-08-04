import { describe, expect, it } from 'vitest'
import { resolveSignalMultiplier } from '../planner/mechanics/signalMultiplier'
import { buildInput, createHero } from '../planner/mechanics/mechanicTestFixtures'
import type { EquipmentBuff } from '../buffs/equipmentMult'
import { applyEquipmentBuffsToProfile } from './equipmentBuffSignals'
import type { HeroAbilitySignal, ResolvedHeroAbilityProfile } from './abilityModel'

const baseSignal = (overrides: Partial<HeroAbilitySignal> & { rawEffect: string }): HeroAbilitySignal => ({
  kind: 'heroDpsMultiplier',
  value: 100,
  source: 'official-parsed',
  ...overrides,
})

const makeProfile = (
  carry: HeroAbilitySignal[] = [],
  support: HeroAbilitySignal[] = [],
): ResolvedHeroAbilityProfile =>
  ({
    heroId: '7',
    carrySignals: carry,
    supportSignals: support,
    unsupportedSignals: [],
    sourceBreakdown: {
      carrySignals: carry.map(() => 'official-parsed'),
      supportSignals: support.map(() => 'official-parsed'),
      unsupportedSignals: [],
    },
  } as unknown as ResolvedHeroAbilityProfile)

const buff = (targetUpgradeId: string, value: number, rawEffect = `buff_upgrade,${value},${targetUpgradeId}`): EquipmentBuff => ({
  targetUpgradeId,
  value,
  rawEffect,
})

describe('applyEquipmentBuffsToProfile', () => {
  it('按 target upgradeId 反查 direct base，构造 wrapper 追加到 base 所在 bucket', () => {
    const base = baseSignal({ rawEffect: 'hero_dps_multiplier_mult,100', upgradeId: '4' })
    const profile = applyEquipmentBuffsToProfile(makeProfile([base]), [buff('4', 275)])
    expect(profile.carrySignals).toHaveLength(2)
    const wrapper = profile.carrySignals[1]!
    expect(wrapper.kind).toBe('heroDpsMultiplier')
    expect(wrapper.value).toBe(275)
    expect(wrapper.rawEffect).toBe('buff_upgrade,275,4')
    expect(wrapper.bonusScaleOfSignal).toBe(base)
    // plain loot wrapper：不继承 base 的 stack 语义（走 applySignalPercent 路径）
    expect(wrapper.amountFunc).toBeNull()
    expect(wrapper.stackFunc).toBeNull()
  })

  it('base 在 support → wrapper 路由到 support（保留 pool 归属）', () => {
    const base = baseSignal({ rawEffect: 'global_dps_multiplier_mult,100', kind: 'globalDpsMultiplier', upgradeId: '9' })
    const profile = applyEquipmentBuffsToProfile(makeProfile([], [base]), [buff('9', 50)])
    expect(profile.carrySignals).toHaveLength(0)
    expect(profile.supportSignals).toHaveLength(2)
    expect(profile.supportSignals[1]!.bonusScaleOfSignal).toBe(base)
  })

  it('【追加非替换】base signal 必须保留', () => {
    const base = baseSignal({ rawEffect: 'hero_dps_multiplier_mult,100', upgradeId: '4' })
    const profile = applyEquipmentBuffsToProfile(makeProfile([base]), [buff('4', 275)])
    expect(profile.carrySignals.map((s) => s.rawEffect)).toContain('hero_dps_multiplier_mult,100')
  })

  it('enemyVulnerability base → 构造 wrapper（vulnFactor addPercent 累加，wrapper 放大 base.value；继承 monsterTags）', () => {
    const base = baseSignal({
      rawEffect: 'monster_with_tag_more_damage,300,beast',
      kind: 'enemyVulnerability',
      value: 300,
      upgradeId: '5',
      monsterTags: ['beast'],
    })
    const profile = applyEquipmentBuffsToProfile(makeProfile([], [base]), [buff('5', 40)])
    expect(profile.supportSignals).toHaveLength(2) // base + wrapper
    const wrapper = profile.supportSignals[1]!
    expect(wrapper.kind).toBe('enemyVulnerability')
    expect(wrapper.value).toBe(40)
    expect(wrapper.bonusScaleOfSignal).toBe(base)
    expect(wrapper.monsterTags).toEqual(['beast']) // 继承 base monsterTags（条件匹配用）
  })

  it('damageReduction base → 构造 wrapper（survival 池 addPercent 累加，影响 effectiveHealth/推图层数）', () => {
    const base = baseSignal({ rawEffect: 'damage_reduction,30', kind: 'damageReduction', value: 30, upgradeId: '7' })
    const profile = applyEquipmentBuffsToProfile(makeProfile([base]), [buff('7', 50)])
    expect(profile.carrySignals).toHaveLength(2)
    expect(profile.carrySignals[1]!.kind).toBe('damageReduction')
    expect(profile.carrySignals[1]!.bonusScaleOfSignal).toBe(base)
  })

  it('attackSpeed/cooldown base 暂不收（base 不进评分，注入 wrapper 也无效，需先让 speed 进评分）', () => {
    const speedBase = baseSignal({ rawEffect: 'attack_speed_mult,20', kind: 'attackSpeedMult', upgradeId: '8' })
    const original = makeProfile([speedBase])
    expect(applyEquipmentBuffsToProfile(original, [buff('8', 40)])).toBe(original)
  })

  it('【防递归】wrapper signal（bonusScaleOfSignal!=null）不作 base，即使 upgradeId 匹配', () => {
    // 递归 buff_upgrade 元家族：一个 wrapper 指向另一个 wrapper。后者不作 base → 不构造递归 wrapper。
    const innerWrapper = baseSignal({
      rawEffect: 'buff_upgrade,200,4',
      upgradeId: '6',
      bonusScaleOfSignal: baseSignal({ rawEffect: 'hero_dps_multiplier_mult,100', upgradeId: '4' }),
    })
    const original = makeProfile([innerWrapper])
    const profile = applyEquipmentBuffsToProfile(original, [buff('6', 275)])
    expect(profile).toBe(original) // innerWrapper 被 bonusScaleOfSignal!=null 排除，无 wrapper
  })

  it('无匹配 upgradeId（target base 不在 profile）→ 原样返回', () => {
    const base = baseSignal({ rawEffect: 'hero_dps_multiplier_mult,100', upgradeId: '4' })
    const original = makeProfile([base])
    expect(applyEquipmentBuffsToProfile(original, [buff('999', 275)])).toBe(original)
  })

  it('无 upgradeId 的 base signal 不可被反查（无 target 命中）', () => {
    const base = baseSignal({ rawEffect: 'hero_dps_multiplier_mult,100', upgradeId: null })
    const original = makeProfile([base])
    expect(applyEquipmentBuffsToProfile(original, [buff('4', 275)])).toBe(original)
  })

  it('空 buffs → 原样返回', () => {
    const original = makeProfile([baseSignal({ rawEffect: 'hero_dps_multiplier_mult,100', upgradeId: '4' })])
    expect(applyEquipmentBuffsToProfile(original, [])).toBe(original)
  })

  it('多 target（buff_upgrades）→ 各 target base 各得一个 wrapper', () => {
    const baseA = baseSignal({ rawEffect: 'hero_dps_multiplier_mult,100', upgradeId: '11' })
    const baseB = baseSignal({ rawEffect: 'global_dps_multiplier_mult,50', kind: 'globalDpsMultiplier', upgradeId: '12' })
    const multi: EquipmentBuff = {
      targetUpgradeId: '11',
      value: 87.5,
      rawEffect: 'buff_upgrades,87.5,11,12',
    }
    // collectEquipmentBuffsByHero 会把 buff_upgrades 展开为每 target 一个 EquipmentBuff；
    // 这里直接传两条（模拟展开后形态）
    const profile = applyEquipmentBuffsToProfile(makeProfile([baseA], [baseB]), [
      multi,
      { ...multi, targetUpgradeId: '12' },
    ])
    expect(profile.carrySignals).toHaveLength(2) // baseA + wrapperA
    expect(profile.supportSignals).toHaveLength(2) // baseB + wrapperB
    expect(profile.carrySignals[1]!.value).toBe(87.5)
    expect(profile.supportSignals[1]!.value).toBe(87.5)
  })

  it('【stacksMultiply base】wrapper 不继承 base 的 stacksMultiply/applyManually（防 (1+buff/100)^N 灾难高估）', () => {
    // 真实场景：118 个 stacksMultiply base signal（如蔚出言不逊/善良榜样）带 upgradeId，156 条 loot
    // buff_upgrade 命中。wrapper 若继承 stacksMultiply → 走 resolveSignalMultiplier 的 stacking 分支，
    // 被 (1+25/100)^1000 ≈ 10^97 灾难高估。applySignalPercent 已为 stacksMultiply base 按 base.value×buff/100
    // 折算（见 signalMultiplier.test.ts「bonusScaleOfSignal 折叠」），wrapper 须显式落回该路径。
    const base = baseSignal({
      rawEffect: 'hero_dps_mult_per_tagged_crusader_mult,50',
      value: 50,
      upgradeId: '42',
      stacksMultiply: true,
      applyManually: true,
    })
    const profile = applyEquipmentBuffsToProfile(makeProfile([base]), [buff('42', 25)])
    const wrapper = profile.carrySignals[1]!
    expect(wrapper.bonusScaleOfSignal).toBe(base)
    // 不得继承 stacksMultiply/applyManually——wrapper 是固定百分比放大，非堆叠/手动信号。
    expect(wrapper.stacksMultiply).toBeFalsy()
    expect(wrapper.applyManually).toBeFalsy()
  })

  it('【stacksMultiply base 集成】wrapper 经 applySignalPercent 折算为 base.value×buff/100，非 (1+buff/100)^N', () => {
    // base = stacksMultiply value=50，manualStackCount=2 → base 聚合 (1.5)^2=2.25（>1，生效）。
    // wrapper 经 applySignalPercent：percentToMultiplier(base.value × buff / 100) = 1 + 50×25/100/100 = 1.125。
    // 旧 bug（继承 stacksMultiply）：(1+25/100)^2 = 1.5625（且 count=1000 时 10^97 灾难）。
    const base = baseSignal({
      rawEffect: 'hero_dps_mult_per_tagged_crusader_mult,50',
      value: 50,
      upgradeId: '42',
      stacksMultiply: true,
    })
    const profile = applyEquipmentBuffsToProfile(makeProfile([base]), [buff('42', 25)])
    const wrapper = profile.carrySignals[1]!
    const r = resolveSignalMultiplier(
      buildInput({
        carryHero: createHero('carry'),
        supportHero: createHero('support'),
        manualStackCount: 2,
      }),
      wrapper,
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.multiplier).toBeCloseTo(1.125, 10)
  })
})
