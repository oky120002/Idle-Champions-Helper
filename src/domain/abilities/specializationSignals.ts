import {
  applyHeroAbilityPatch,
  type HeroAbilityDimension,
  type HeroAbilitySignal,
  type ResolvedHeroAbilityProfile,
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
 *（upgradeId/specializationName/signals.dimension/.signal），序列化兼容 specialization-catalog.json。
 */
export interface SpecializationSignalEntry {
  dimension: HeroAbilityDimension
  signal: HeroAbilitySignal
}

export interface SpecializationEntry {
  upgradeId: string
  specializationName: { original: string; display: string } | null
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
 * 应用玩家已选专精 signal 到 profile（注入 supportSignals）。
 * 无 active 专精 signal → 原样返回（不建空 patch）。
 */
export function applySpecializationsToProfile(
  profile: ResolvedHeroAbilityProfile,
  activeUpgradeIds: readonly string[],
  heroSpecializations: readonly SpecializationEntry[] | undefined,
): ResolvedHeroAbilityProfile {
  const signals = selectSpecializationSignals(activeUpgradeIds, heroSpecializations)
  if (signals.length === 0) {
    return profile
  }
  return applyHeroAbilityPatch(
    profile,
    { heroId: profile.heroId, supportSignals: signals },
    'official-parsed',
  )
}
