/**
 * 传奇装备效果（Legendary Effects）评分接入。
 *
 * 990 条传奇效果（165 英雄 × 6 槽），94 个唯一 effectId（跨英雄共享），两种 effect key：
 * global_dps_multiplier_mult（499）+ hero_dps_multiplier_mult（491）。
 *
 * 与普通装备加成的本质差异：
 * - owned-aware：仅锻造槽位生效（存档 legendaryBySlot 决定）
 * - placement-aware：拥有者必须在阵型中才贡献
 * - per_crusader：按满足条件的阵型英雄数叠加（55 无条件 + 327 有条件）
 *
 * 通道路由：
 * - global_dps 无 per_crusader（117 条）→ 合入 equipmentGlobalDpsByHero（复用 placement-aware 求和）
 * - global_dps per_crusader（382 条）→ LegendaryContribution global 池，baseValue × matchingCount
 * - hero_dps 带 filter（491 条）→ LegendaryContribution hero 池，carry 匹配 targetQualifier 时生效
 *
 * 等级缩放：value = base × level（线性，保守默认）。
 */

import { parseEffectPayload } from '../effects/effect-string'
import { normalizeTargetQualifier } from '../abilities/signalSemantics'
import type { HeroQualifier } from '../abilities/abilityModel'
import type { OwnedHero } from '../user-profile/types'

const GLOBAL_DPS_KIND = 'global_dps_multiplier_mult'
const HERO_DPS_KIND = 'hero_dps_multiplier_mult'

/** 传奇效果目录条目（从 legendary_effect_defines 提取，94 条唯一定义）。 */
export interface LegendaryEffectCatalogEntry {
  /** 效果定义 id（全局唯一，跨英雄共享）。 */
  id: string
  /** 效果字符串（`effect_key,base_value`，与能力信号同构）。 */
  effectString: string
  /** 叠加方式（`per_crusader` = 按阵型英雄叠加；null = 固定值）。 */
  stackFunc: string | null
  /** count 限定原始数据（target_filters，per_crusader 的计数条件）。 */
  targetFilters: unknown[] | null
  /** buff 目标限定原始数据（filter_targets，hero_dps 的筛选条件）。 */
  filterTargets: unknown[] | null
}

/** 一个传奇装备贡献（placement-aware + count-aware，在评分引擎中求值）。 */
export interface LegendaryContribution {
  /** 拥有传奇装备的英雄 id（必须在阵型中才生效）。 */
  ownerHeroId: string
  /** 'global' = 全队伤害加成池；'hero' = carry 条件加成池。 */
  pool: 'global' | 'hero'
  /** 等级缩放后的百分比基数（base × level）。 */
  baseValue: number
  /** hero pool 的 buff 目标限定（仅 pool='hero' 时有效）；null = 对所有 carry 生效。 */
  targetQualifier: HeroQualifier | null
  /** 是否按阵型计数叠加（per_crusader）。 */
  perCrusader: boolean
  /** 叠加计数限定（perCrusader=true 时有效）；null = 计数全体阵型英雄。 */
  countQualifier: HeroQualifier | null
}

/** collectLegendaryContributions 的返回值。 */
export interface LegendaryContributions {
  /** 简单 global_dps（无 per_crusader）的 per-hero addPercent（合入 equipmentGlobalDpsByHero）。 */
  globalDpsAddPercent: Map<string, number>
  /** per_crusader 和 hero_dps 的贡献列表（在评分引擎中 placement-aware 求值）。 */
  contributions: LegendaryContribution[]
}

/** 按 id 索引目录。 */
function indexCatalog(catalog: readonly LegendaryEffectCatalogEntry[]): Map<string, LegendaryEffectCatalogEntry> {
  const index = new Map<string, LegendaryEffectCatalogEntry>()
  for (const entry of catalog) {
    index.set(entry.id, entry)
  }
  return index
}

/**
 * 从存档的传奇数据和效果目录收集评分贡献。
 *
 * 遍历 ownedHeroes.legendaryBySlot：对每个已锻造槽位（effectId 非空），
 * 查目录获取效果定义 → 按等级缩放 → 按类型路由到 globalDpsAddPercent 或 contributions。
 *
 * - 无存档 / 无锻造 → 空（向后兼容）
 * - 目录中找不到 effectId → 跳过（宁可不准不可错）
 */
export function collectLegendaryContributions(
  ownedHeroes: readonly OwnedHero[],
  catalog: readonly LegendaryEffectCatalogEntry[],
): LegendaryContributions {
  const index = indexCatalog(catalog)
  const globalDpsAddPercent = new Map<string, number>()
  const contributions: LegendaryContribution[] = []

  for (const hero of ownedHeroes) {
    for (const slot of Object.values(hero.legendaryBySlot)) {
      if (!slot.effectId) {
        continue
      }
      const entry = index.get(slot.effectId)
      if (!entry) {
        continue
      }
      const parsed = parseEffectPayload(entry.effectString)
      if (!parsed) {
        continue
      }
      const baseValue = Number(parsed.args[0])
      if (!Number.isFinite(baseValue) || baseValue === 0) {
        continue
      }
      const level = Math.max(1, slot.level)
      const scaledValue = baseValue * level
      const isPerCrusader = entry.stackFunc === 'per_crusader'

      if (parsed.kind === GLOBAL_DPS_KIND && !isPerCrusader) {
        // 简单 global_dps → 合入 equipmentGlobalDpsByHero（复用 placement-aware 求和）
        globalDpsAddPercent.set(hero.heroId, (globalDpsAddPercent.get(hero.heroId) ?? 0) + scaledValue)
      } else {
        // per_crusader global_dps 或 hero_dps → LegendaryContribution
        const isHeroPool = parsed.kind === HERO_DPS_KIND
        const targetQualifier = isHeroPool
          ? normalizeTargetQualifier({ filter_targets: entry.filterTargets ?? [], target_filters: entry.targetFilters ?? [] })
          : null
        const countQualifier = isPerCrusader
          ? normalizeTargetQualifier({ target_filters: entry.targetFilters ?? [] })
          : null
        contributions.push({
          ownerHeroId: hero.heroId,
          pool: isHeroPool ? 'hero' : 'global',
          baseValue: scaledValue,
          targetQualifier,
          perCrusader: isPerCrusader,
          countQualifier,
        })
      }
    }
  }

  return { globalDpsAddPercent, contributions }
}
