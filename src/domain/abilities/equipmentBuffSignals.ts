import type { EquipmentBuff } from '../buffs/equipmentMult'
import {
  appendHeroAbilitySignals,
  type HeroAbilityKind,
  type HeroAbilitySignal,
  type ResolvedHeroAbilityProfile,
} from './abilityModel'

/**
 * 装备 buff_upgrade 运行时信号注入（Phase B 方向 A 阶段 2）。
 *
 * 装备 buff_upgrade 是 wrapper（放大英雄自身某 upgrade 的效果值），与 feat/专精同构——owned-aware，
 * runtime 注入。与 feat/专精的差异：buff_upgrade 不是独立加性 signal，而是 bonusScaleOfSignal 指向
 * base 的派生 signal（放大基数 = base.value，见 signalMultiplier.ts applySignalPercent）。
 *
 * 数据流：buildScoringBonusInputs → collectEquipmentBuffsByHero（owned loot + loot-catalog + enchant
 * 缩放）→ ScoringBonusInputs.equipmentBuffsByHero → options → engine applyEquipmentBuffs → 本函数。
 *
 * target 反查：按 EquipmentBuff.targetUpgradeId 在 profile 的 direct base signal（upgradeId 匹配 +
 * bonusScaleOfSignal==null，排除 wrapper 自身防递归元家族）中找基数。只接 DPS/gold/crit/health kind
 *（brief 226 个 DPS 直相关 target）；非该范围 / 递归 / 语义不明 → 找不到 direct base → 自然「没算」
 *（宁可不准不可错）。wrapper 路由到 base 所在 bucket（carry/support），保留 base 的 pool 归属。
 *
 * wrapper 构造镜像 build 期 collectEffectEntries preset（effect-helpers.ts:777-792）的 plain loot 形态：
 * amountFunc/stackFunc/formationCountQualifier=null（走 applySignalPercent(signal.value) 路径），
 * bonusScaleOfSignal=base（live，placement 上下文内递归 resolve，等价 build 期嵌入快照——profile 单次
 * 构建，base 静态字段不变）。loot 全是 plain（2168 条 0 stacks_multiply），复杂变体不接。
 */

/** 接受 buff_upgrade 放大的 base signal kind（DPS/gold/crit/health，brief 226 target 范围）。 */
const SUPPORTED_BUFF_TARGET_KINDS = new Set<HeroAbilityKind>([
  'heroDpsMultiplier',
  'globalDpsMultiplier',
  'globalGoldMultiplier',
  'heroHealthMultiplier',
  'globalHealthMultiplier',
  'heroCritChance',
  'globalCritChance',
  'heroCritDamage',
  'globalCritDamage',
])

/**
 * 构造装备 buff_upgrade wrapper signal（镜像 build 期 plain loot preset 形态）。
 * bonusScaleOfSignal=base（live），value=enchant 缩放后 wrapper 百分比；走 applySignalPercent 路径。
 */
function buildEquipmentBuffWrapper(base: HeroAbilitySignal, buff: EquipmentBuff): HeroAbilitySignal {
  return {
    ...base,
    rawEffect: buff.rawEffect,
    value: buff.value,
    bonusScaleOfSignal: base,
    // plain loot wrapper：不继承 base 的 stack/count 语义（与 build 期 buffSeed=null 一致）。
    amountFunc: null,
    stackFunc: null,
    formationCountQualifier: null,
    formationCountPositionQualifier: null,
  }
}

/**
 * 应用 owned 装备 buff_upgrade 到 profile：按 target upgradeId 反查 direct base signal，构造 wrapper
 * 按 base 所在 bucket 追加（appendHeroAbilitySignals，保留 base 信号）。无匹配 base → 无 wrapper（原样返回）。
 */
export function applyEquipmentBuffsToProfile(
  profile: ResolvedHeroAbilityProfile,
  buffs: readonly EquipmentBuff[],
): ResolvedHeroAbilityProfile {
  if (buffs.length === 0) {
    return profile
  }

  // direct base signal 按 upgradeId 索引（分 carry/support 保留 bucket 归属）。
  const carryByUpgradeId = new Map<string, HeroAbilitySignal[]>()
  const supportByUpgradeId = new Map<string, HeroAbilitySignal[]>()
  const indexBase = (
    index: Map<string, HeroAbilitySignal[]>,
    signal: HeroAbilitySignal,
  ): void => {
    if (signal.bonusScaleOfSignal) {
      return // wrapper 自身不作 base（防递归 buff_upgrade 元家族）
    }
    if (!signal.upgradeId) {
      return // 无 upgrade id 不可被 target 反查
    }
    if (!SUPPORTED_BUFF_TARGET_KINDS.has(signal.kind)) {
      return // 非 DPS/gold/crit/health target → 没算（宁可不准不可错）
    }
    const list = index.get(signal.upgradeId) ?? []
    list.push(signal)
    index.set(signal.upgradeId, list)
  }
  for (const signal of profile.carrySignals) {
    indexBase(carryByUpgradeId, signal)
  }
  for (const signal of profile.supportSignals) {
    indexBase(supportByUpgradeId, signal)
  }

  const carryWrappers: HeroAbilitySignal[] = []
  const supportWrappers: HeroAbilitySignal[] = []
  for (const buff of buffs) {
    for (const base of carryByUpgradeId.get(buff.targetUpgradeId) ?? []) {
      carryWrappers.push(buildEquipmentBuffWrapper(base, buff))
    }
    for (const base of supportByUpgradeId.get(buff.targetUpgradeId) ?? []) {
      supportWrappers.push(buildEquipmentBuffWrapper(base, buff))
    }
  }

  if (carryWrappers.length === 0 && supportWrappers.length === 0) {
    return profile
  }
  return appendHeroAbilitySignals(
    profile,
    { carrySignals: carryWrappers, supportSignals: supportWrappers },
    'official-parsed',
  )
}
