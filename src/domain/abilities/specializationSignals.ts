import {
  appendHeroAbilitySignals,
  type HeroAbilityDimension,
  type HeroAbilitySignal,
  type ResolvedHeroAbilityProfile,
  type SignalBucket,
} from './abilityModel'
import { computeHeroSpeedGain, type SpeedEffectEntry } from '../planner/speedScoring'

/**
 * 专精（specialization）运行时信号注入。
 *
 * specializationCatalog（build 期 champion-details 专精 upgrade 归一化，scripts/data/specialization-catalog.ts）
 * 按 heroId 索引 SpecializationEntry[]；每专精 upgrade 含按 dimension 归类、按 bucket 路由的 signal。
 * 运行时按玩家选择（OwnedHero.specializations = 选中的 upgradeId）注入选中专精的全部 signal → 按 bucket
 * 追加到 profile（保留 base 信号）。
 *
 * 与 feat 同构（ADR 0017 不变量）：不做 scoringMode 维度预过滤——专精是玩家全局互斥选择，scoring 按模式
 * 自取所需维度（carry-dps 取 damage/crit/vulnerability，team-gold 取 gold），与外部化前 base 行为对称。
 * 若按 damage/gold 预过滤会漏掉 vulnerability 维度（如明斯克偏好敌人）。
 *
 * 消费类型与 scripts/data/specialization-catalog.ts 的 SpecializationEntry 字段对齐
 *（upgradeId/specializationName/requiredLevel/signals.dimension/.bucket/.signal），序列化兼容 specialization-catalog.json。
 */
export interface SpecializationSignalEntry {
  dimension: HeroAbilityDimension
  /** build 期 resolveBucket 判定的归属（自增益 carrySignals / 支援全局 supportSignals）。 */
  bucket: SignalBucket
  signal: HeroAbilitySignal
}

export interface SpecializationEntry {
  upgradeId: string
  specializationName: { original: string; display: string } | null
  /**
   * 专精 upgrade 解锁等级（来自 build 期 specialization-catalog）。UI 按 requiredLevel 分层：
   * 同 requiredLevel = 同层互斥（单选），不同 requiredLevel = 不同层各选一个。
   * undefined/null = 无等级信息或旧 catalog（向后兼容）。engine 不消费此字段。
   */
  requiredLevel?: number | null
  /**
   * 前置专精 upgrade id（champion-details upgrade.required_upgrade_id）：级联型专精树的依赖层选项
   * 指向上层选择（如 hero 165「与诸神交涉」→ 分支）。UI 据此过滤 prereq 未满足的选项 + 改上层时
   * 级联清下层孤立选择。null/undefined = 无前置（顶层）；指向非 catalog 选项（普通升级 gate 或哨兵）
   * = 视为恒满足。engine 不消费此字段。undefined 兼容旧 catalog。
   */
  requiredUpgradeId?: string | null
  signals: SpecializationSignalEntry[]
  /** 专精携带的速度效果（team-speed 模式 runtime 按玩家选择注入 speedProfile）。 */
  speedEffects?: SpeedEffectEntry[]
}

export type SpecializationCatalog = Record<string, SpecializationEntry[]>

/**
 * 应用玩家已选专精 signal 到 profile：按 build 期 bucket 追加到 carry/support（保留 base 信号）。
 *
 * 关键不变量（ADR 0017）：注入后 =「base 只含该选中专精」的预外部化行为。故
 *  - bucket 路由：自增益（hero_dps 无目标）→ carrySignals，仅自走 carry 时计入；支援/全局 → supportSignals。
 *    复现 collectSignals 的 carry/support 区分，避免自增益泄漏到其他 carry。
 *  - 追加而非替换：误用 applyHeroAbilityPatch 传子集会整体替换、抹掉 base 支援信号（35→2，P0 根因）。
 * 无 active 专精 signal → 原样返回。
 */
export function applySpecializationsToProfile(
  profile: ResolvedHeroAbilityProfile,
  activeUpgradeIds: readonly string[],
  heroSpecializations: readonly SpecializationEntry[] | undefined,
  heroLevel: number,
): ResolvedHeroAbilityProfile {
  const active = new Set(activeUpgradeIds)
  const carry: HeroAbilitySignal[] = []
  const support: HeroAbilitySignal[] = []
  const specSpeedEffects: SpeedEffectEntry[] = []
  for (const entry of heroSpecializations ?? []) {
    if (!active.has(entry.upgradeId)) {
      continue
    }
    // 等级门控：等级不够 requiredLevel 的专精不注入信号
    if (entry.requiredLevel != null && heroLevel < entry.requiredLevel) {
      continue
    }
    for (const signalEntry of entry.signals) {
      if (signalEntry.bucket === 'carrySignals') {
        carry.push(signalEntry.signal)
      } else {
        support.push(signalEntry.signal)
      }
    }
    // 速度效果注入（专精源速度效果，如 Melf 快速刷新 / Farideh 额外刷怪）
    if (entry.speedEffects && entry.speedEffects.length > 0) {
      specSpeedEffects.push(...entry.speedEffects)
    }
  }
  if (carry.length === 0 && support.length === 0 && specSpeedEffects.length === 0) {
    return profile
  }
  const withSignals = (carry.length > 0 || support.length > 0)
    ? appendHeroAbilitySignals(profile, { carrySignals: carry, supportSignals: support }, 'official-parsed')
    : profile
  // 速度效果合并进 speedProfile（base + spec 叠加）
  if (specSpeedEffects.length > 0) {
    const baseEffects = withSignals.speedProfile?.effects ?? []
    const mergedEffects = [...baseEffects, ...specSpeedEffects]
    return {
      ...withSignals,
      speedProfile: {
        heroId: withSignals.heroId,
        effects: mergedEffects,
        speedGain: computeHeroSpeedGain(mergedEffects),
      },
    }
  }
  return withSignals
}
