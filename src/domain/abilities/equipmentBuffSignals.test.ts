import { describe, expect, it } from 'vitest'
import { applyEquipmentBuffsToProfile } from './equipmentBuffSignals'
import type { EquipmentBuff } from '../buffs/equipmentMult'
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

  it('【step④】非 DPS/gold/crit/health kind 的 base 不被放大（enemyVulnerability → 没算）', () => {
    const base = baseSignal({ rawEffect: 'monster_vulnerability,50', kind: 'enemyVulnerability', upgradeId: '5' })
    const original = makeProfile([], [base])
    const profile = applyEquipmentBuffsToProfile(original, [buff('5', 275)])
    expect(profile).toBe(original) // 无 wrapper → 原样返回
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
})
