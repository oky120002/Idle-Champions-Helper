import type { BlessingCatalogEntry } from '../user-profile/types'
import {
  type ActiveCatalogEffect,
  type EffectDefinitionEntry,
  parseEffectKind,
  resolveEffectDefinitionKeys,
  resolveEffectKeyValue,
} from './effectDefinitionDps'

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
 * 只接 `global_dps_multiplier_mult`（无条件全局 DPS）：裸 `,$replace` 与 `effect_def,<id>` 引用
 * （后者解引用 effect-definitions.json template 筛 global_dps kind；hero_dps kind 不计入 globalBuff，
 * 由 externalHeroDpsMult per-carry 处理）。value = perLevel × actualLevel（$replace）或固定值；
 * 返回 add pool multiplier `1 + Σ(value)/100`，与 patronPerkGlobalBuff 同构——两者同属 global_dps add pool，
 * 由 combineGlobalBuffMultipliers 合并。未购买（level=0/缺）/ 非当前 campaign 的地图 blessing /
 * 非 global_dps effect → 不计。未导入存档（actualLevels=null/空）→ 1（无加成，向后兼容）。
 *
 * global_dps_mult_per_* 计数留后续（需 per-X 整队计数）。
 *
 * BlessingCatalogEntry 类型定义在 ../user-profile/types（数据契约归数据层，snapshot 直接消费）。
 */

const GLOBAL_DPS_KIND = 'global_dps_multiplier_mult'

/**
 * 收集 active blessing 的 catalog effects（type 2 全算 / type 1 仅 currencyId === currentCampaignId）+ actual level。
 * active 过滤单一来源：globalBuff（global_dps）与 externalHeroDpsMult（hero_dps per-carry）复用，
 * 避免 #7 的地图 blessing 过滤规则在两处漂移。未导入存档（null）→ 空。
 */
export function collectActiveBlessingEffects(
  actualLevels: Readonly<Record<string, number>> | null,
  blessings: readonly BlessingCatalogEntry[],
  currentCampaignId?: string | number | null,
): ActiveCatalogEffect[] {
  if (!actualLevels) {
    return []
  }
  const campaign = currentCampaignId ?? null
  const out: ActiveCatalogEffect[] = []
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
      out.push({ effectString: effect.effectString, perLevel: effect.perLevel, level })
    }
  }
  return out
}

/**
 * 算 actual blessing globalBuffMultiplier（用户实际购买等级）。
 * - type 2（全局）全算；type 1（地图）仅 currencyId === currentCampaignId。
 * - currentCampaignId 缺省 → 不过滤（全算，向后兼容/非 per-campaign 评估场景）。
 * - effectDefTemplates：effect-definitions.json 的 id → template（解引用 `effect_def,<id>` 引用）；
 *   缺省 → 只算裸 `global_dps_multiplier_mult,$replace`（向后兼容）。
 */
export function computeActualBlessingGlobalBuff(
  actualLevels: Readonly<Record<string, number>> | null,
  blessings: readonly BlessingCatalogEntry[],
  currentCampaignId?: string | number | null,
  effectDefTemplates?: ReadonlyMap<string, EffectDefinitionEntry> | null,
): number {
  const effects = collectActiveBlessingEffects(actualLevels, blessings, currentCampaignId)
  let addPercent = 0
  for (const effect of effects) {
    // effect_def,<id> 引用 → 解引用 template effectKeys；裸 effect_string → 自身。
    const keys = resolveEffectDefinitionKeys(effect.effectString, effectDefTemplates)
    const effectStrings = keys ? keys.map((key) => key.effectString) : [effect.effectString]
    for (const es of effectStrings) {
      if (parseEffectKind(es) !== GLOBAL_DPS_KIND) {
        continue
      }
      const value = resolveEffectKeyValue(es, effect.perLevel, effect.level)
      if (value > 0) {
        addPercent += value
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
