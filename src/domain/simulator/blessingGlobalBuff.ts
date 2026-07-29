/**
 * 祝福（blessing）实际等级的全局 DPS 加成。
 *
 * 数据源（⚠️ 在 userdetails，非 raw getdefinitions；IC 服务端技术字段名 `reset_upgrade`，
 * 游戏概念/玩家术语为 blessing，本模块统一用 blessing 命名）：
 * - 定义：`userdetails.defines.reset_upgrade_defines`（200 条）
 * - actual level：`userdetails.details.reset_upgrade_levels`（id → level）
 *
 * **全局/地图区分**（`type` 字段）：
 * - type 2（全局 blessing，50 条）：跨所有 campaign 生效，**全算**。
 * - type 1（地图 blessing，150 条）：仅 `currencyId`(=reset_currency_id) 匹配当前 campaign 的生效。
 *
 * 只接 `global_dps_multiplier_mult,$replace`（无条件全局 DPS）。
 * value = perLevel × actualLevel；返回 add pool multiplier `1 + Σ(value)/100`，
 * 与 patronPerkGlobalBuff 同构——两者同属 global_dps add pool，由 combineGlobalBuffMultipliers 合并。
 * 未购买（level=0/缺）/ 非当前 campaign 的地图 blessing / 非 global_dps effect → 不计。
 * 未导入存档（actualLevels=null/空）→ 1（无加成，向后兼容）。
 *
 * effect_def tag 限定（142 条）与 global_dps_mult_per_* 计数留后续（需 tag/英雄匹配）。
 */

export interface BlessingCatalogEntry {
  id: string
  /** 1=地图（仅 currencyId campaign 生效）/ 2=全局（跨 campaign）。 */
  type: number
  /** campaign id（地图 blessing 的 reset_currency_id）；全局 blessing 归属购买 campaign。 */
  currencyId: number
  effects: ReadonlyArray<{ effectString: string; perLevel: number }>
}

const GLOBAL_DPS_EFFECT_STRING = 'global_dps_multiplier_mult,$replace'

/**
 * 算 actual blessing globalBuffMultiplier（用户实际购买等级）。
 * - type 2（全局）全算；type 1（地图）仅 currencyId === currentCampaignId。
 * - currentCampaignId 缺省 → 不过滤（全算，向后兼容/非 per-campaign 评估场景）。
 */
export function computeActualBlessingGlobalBuff(
  actualLevels: Readonly<Record<string, number>> | null,
  blessings: readonly BlessingCatalogEntry[],
  currentCampaignId?: string | number | null,
): number {
  if (!actualLevels) {
    return 1
  }
  const campaign = currentCampaignId ?? null
  let addPercent = 0
  for (const blessing of blessings) {
    // 地图 blessing（type 1）仅当前 campaign；全局（type 2 等）全算
    if (blessing.type === 1 && campaign !== null && String(blessing.currencyId) !== String(campaign)) {
      continue
    }
    const level = actualLevels[blessing.id] ?? 0
    if (level <= 0) {
      continue
    }
    for (const effect of blessing.effects) {
      if (effect.effectString !== GLOBAL_DPS_EFFECT_STRING) {
        continue
      }
      if (effect.perLevel > 0) {
        addPercent += effect.perLevel * level
      }
    }
  }
  return 1 + addPercent / 100
}

/**
 * 合并多个 global_dps add pool 的 multiplier 为单一 pool。
 * IC 的 global_dps_multiplier_mult（patron perk + blessing + modron + ...）共享同一 add pool：
 * `1 + Σ(all value)/100`。各源算成 `1 + Σ_own/100` 后合并 = `1 + Σ(mult-1)`。
 *
 * 例：patronMult=55.7（1+5470/100）+ blessingMult=68（1+6700/100）→ 1+(5470+6700)/100=122.7。
 */
export function combineGlobalBuffMultipliers(multipliers: readonly number[]): number {
  if (multipliers.length === 0) {
    return 1
  }
  let sum = 0
  for (const mult of multipliers) {
    sum += mult - 1
  }
  return 1 + sum
}
