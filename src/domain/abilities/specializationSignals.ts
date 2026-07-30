import {
  appendHeroAbilitySignals,
  type HeroAbilityDimension,
  type HeroAbilitySignal,
  type ResolvedHeroAbilityProfile,
  type SignalBucket,
} from './abilityModel'

/**
 * 专精（specialization）运行时信号注入。
 *
 * specializationCatalog（build 期 champion-details 专精 upgrade 归一化，scripts/data/specialization-catalog.ts）
 * 按 heroId 索引 SpecializationEntry[]；每专精 upgrade 含按 dimension 归类的 signal。运行时按玩家选择
 * （OwnedHero.specializations = 选中的 upgradeId）注入对应 signal → applyHeroAbilityPatch 写入 profile。
 *
 * 与 feat 的差异：专精不做 scoringMode 维度过滤——专精是玩家全局互斥选择（非按模式启用的 feat 槽），
 * 注入选中专精的全部 scoring signal（scoring 按模式自取所需维度），与外部化前 base 行为对称（base 本就
 * 含全部维度 spec signal）。若按 damage/gold 过滤会漏掉 vulnerability 维度（如明斯克偏好敌人）。
 *
 * 消费类型与 scripts/data/specialization-catalog.ts 的 SpecializationEntry 字段对齐
 *（upgradeId/specializationName/requiredLevel/signals.dimension/.signal），序列化兼容 specialization-catalog.json。
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
  signals: SpecializationSignalEntry[]
}

export type SpecializationCatalog = Record<string, SpecializationEntry[]>

/**
 * 选玩家已选专精（activeUpgradeIds）的 signal。不做 dimension 过滤（见上）。
 */
export function selectSpecializationSignals(
  activeUpgradeIds: readonly string[],
  heroSpecializations: readonly SpecializationEntry[] | undefined,
): HeroAbilitySignal[] {
  const active = new Set(activeUpgradeIds.map((id) => String(id)))
  const out: HeroAbilitySignal[] = []
  for (const entry of heroSpecializations ?? []) {
    if (!active.has(entry.upgradeId)) {
      continue
    }
    for (const signalEntry of entry.signals) {
      out.push(signalEntry.signal)
    }
  }
  return out
}

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
): ResolvedHeroAbilityProfile {
  const active = new Set(activeUpgradeIds.map((id) => String(id)))
  const carry: HeroAbilitySignal[] = []
  const support: HeroAbilitySignal[] = []
  for (const entry of heroSpecializations ?? []) {
    if (!active.has(entry.upgradeId)) {
      continue
    }
    for (const signalEntry of entry.signals) {
      if (signalEntry.bucket === 'carrySignals') {
        carry.push(signalEntry.signal)
      } else {
        support.push(signalEntry.signal)
      }
    }
  }
  if (carry.length === 0 && support.length === 0) {
    return profile
  }
  return appendHeroAbilitySignals(profile, { carrySignals: carry, supportSignals: support }, 'official-parsed')
}
