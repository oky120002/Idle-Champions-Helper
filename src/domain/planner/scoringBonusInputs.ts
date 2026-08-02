/**
 * 装配 scoring 入参的外部加成字段（装备 + patron perk + blessing）。
 *
 * 从 usePlannerPageModel 下沉为纯函数：无 React 依赖，hook 只 memoize 结果，
 * 解锁 React 外单测。三项分别由 simulator 的 equipment/globalBuff provider 与
 * buffs 的 externalHeroDpsMult provider 计算（#4 加成来源装配下沉）。
 *
 * 装备分支：有存档按 owned per-slot 实际（rarity + enchant）；未导入存档时若传 hypotheticalEquipment
 *（UI what-if：统一稀有度 + 附魔等级，默认毕业=4+2000），按「假设装备」估装备加成（尤其速度/速推），
 * 否则空 map（向后兼容）。有存档优先，假设装备仅无存档分支生效。
 *
 * - equipmentAdjustmentByHero：ownedHeroes.lootBySlot + loot-catalog → per-hero 装备调整比；
 *   未导入存档或 lootCatalog 空 → 空 map（scoreFormation 缺省 ?? 1，向后兼容）。
 * - equipmentHealthByHero：per-hero health_mult multiplier（hero-scoped 生命）；scoreFormation survival 段
 *   并入 carry 的 survival:hero 池；未导入存档 → 空 map。
 * - equipmentGlobalDpsByHero / equipmentGoldByHero：per-hero global-scope addPercent（global_dps / gold）；
 *   scoreFormation/scoreTeamGold 按 placed 英雄求和并入 damage:global / gold:global 池（装备英雄绑定，排除 bench）；
 *   未导入存档 → 空 map。
 * - equipmentCritByHero：per-hero crit mult（hero-scope buff_base_crit_*_mult，chance/damage）；scoreFormation
 *   取 carry 值经 computeCritFactor 独立通道注入（非池聚合）；未导入存档 → 空 map。
 * - equipmentBuffsByHero：per-hero 装备 buff_upgrade wrapper 元数据（owned loot + loot-catalog + enchant 缩放）；
 *   engine applyEquipmentBuffs 按 target upgradeId 反查 base signal 注入 profile（wrapper 通道，非加性数值）；未导入存档 → 空 map。
 * - globalBuffMultiplier：patron + blessing 账号级 global_dps add pool 合并（1 + Σ(value)/100）；
 *   effect_def,<id> 引用的 global_dps 经 effectDefTemplates 解引用计入；未导入存档 → 1。
 * - externalHeroDpsContributions：patron/blessing 的 effect_def hero_dps（带 filter，per-carry 条件生效）；
 *   active 过滤复用 globalBuff 的 collect 单一来源（#7 type1 规则不漂移）；未导入存档 → 空。
 */

import { collectHeroDpsContributions } from '../buffs/externalHeroDpsMult'
import type { EffectDefinitionEntry } from '../buffs/effectDefinitionDps'
import type { HeroDpsContribution } from '../buffs/externalHeroDpsMult'
import { collectActiveBlessingEffects, combineGlobalBuffMultipliers, computeActualBlessingGlobalBuff } from '../buffs/blessingGlobalBuff'
import { computeEquipmentAdjustmentByHero, computeEquipmentCritByHero, computeEquipmentGlobalDpsByHero, computeEquipmentGoldByHero, computeEquipmentHealthByHero, collectEquipmentBuffsByHero, synthesizeHypotheticalLootByHero } from '../buffs/equipmentMult'
import { collectActivePatronPerkEffects, computeActualPatronPerkGlobalBuff } from '../buffs/patronPerkGlobalBuff'
import type { EquipmentBuff, EquipmentCritBonus, HypotheticalEquipmentConfig, LootCatalogEntry } from '../buffs/equipmentMult'
import type { PatronPerkCatalogEntry } from '../buffs/patronPerkGlobalBuff'
import type { FeatCatalog } from '../abilities/featSignals'
import type { OwnedHero, UserProfileSnapshot } from '../user-profile/types'

export interface ScoringBonusInputs {
  equipmentAdjustmentByHero: Map<string, number>
  equipmentHealthByHero: Map<string, number>
  equipmentGlobalDpsByHero: Map<string, number>
  equipmentGoldByHero: Map<string, number>
  equipmentCritByHero: Map<string, EquipmentCritBonus>
  /** per-hero 装备 buff_upgrade wrapper 元数据（owned-aware，enchant 缩放）；engine applyEquipmentBuffs 注入 profile。 */
  equipmentBuffsByHero: Map<string, EquipmentBuff[]>
  globalBuffMultiplier: number
  externalHeroDpsContributions: HeroDpsContribution[]
}

export interface BuildScoringBonusInputsInput {
  profileSnapshot: UserProfileSnapshot | null
  lootCatalog: readonly LootCatalogEntry[]
  effectDefinitions: readonly EffectDefinitionEntry[]
  patronPerkCatalog: readonly PatronPerkCatalogEntry[]
  /**
   * 未导入存档时的「假设装备」配置（UI what-if：稀有度 + 附魔等级）。有存档时忽略（按存档 per-slot 实际）。
   * null/undefined = 不假设（维持现状，装备加成 0，向后兼容）。heroIds 没存档时从 plannerHeroes 传全量。
   */
  hypotheticalEquipment?: HypotheticalEquipmentConfig | null
  /** feat-catalog（feat 源 buff_upgrade wrapper owned-aware 接入）；null/undefined = 不接 feat wrapper。 */
  featCatalog?: FeatCatalog | null
}

/**
 * 收集 owned feat 的 buff_upgrade wrapper（每英雄），合并进 equipmentBuffsByHero 复用 applyEquipmentBuffsToProfile
 * 反查通道。与 applyActiveFeats 同源（owned.feats 决定哪些 feat 生效）；feat 无 enchant 缩放，value=base。
 * feat wrapper target 普通升级节点（反查 base profile signal）；owned feat 装备才放大——owned-aware。
 */
function collectFeatBuffWrappersByHero(
  ownedHeroes: readonly OwnedHero[],
  featCatalog: FeatCatalog | null | undefined,
): Map<string, EquipmentBuff[]> {
  const result = new Map<string, EquipmentBuff[]>()
  if (!featCatalog) {
    return result
  }
  for (const hero of ownedHeroes) {
    const heroFeats = featCatalog[hero.heroId]
    if (!heroFeats || hero.feats.length === 0) {
      continue
    }
    const active = new Set(hero.feats.map(String))
    const buffs: EquipmentBuff[] = []
    for (const feat of heroFeats) {
      if (!active.has(feat.id) || !feat.buffWrappers || feat.buffWrappers.length === 0) {
        continue
      }
      buffs.push(...feat.buffWrappers)
    }
    if (buffs.length > 0) {
      result.set(hero.heroId, buffs)
    }
  }
  return result
}

export function buildScoringBonusInputs(input: BuildScoringBonusInputsInput): ScoringBonusInputs {
  const { profileSnapshot, lootCatalog, effectDefinitions, patronPerkCatalog, hypotheticalEquipment, featCatalog } = input

  let equipmentAdjustmentByHero = new Map<string, number>()
  let equipmentHealthByHero = new Map<string, number>()
  let equipmentGlobalDpsByHero = new Map<string, number>()
  let equipmentGoldByHero = new Map<string, number>()
  let equipmentCritByHero = new Map<string, EquipmentCritBonus>()
  let equipmentBuffsByHero = new Map<string, EquipmentBuff[]>()
  // 有存档用 owned 实际；无存档用假设装备（UI what-if，全英雄统一稀有度+附魔）；否则空（向后兼容）。
  const hasOwnedHeroes = !!profileSnapshot && profileSnapshot.ownedHeroes.length > 0
  const equipmentHeroes = hasOwnedHeroes
    ? profileSnapshot.ownedHeroes
    : hypotheticalEquipment && lootCatalog.length > 0
      ? synthesizeHypotheticalLootByHero(hypotheticalEquipment, lootCatalog)
      : []
  if (equipmentHeroes.length > 0 && lootCatalog.length > 0) {
    equipmentAdjustmentByHero = computeEquipmentAdjustmentByHero(equipmentHeroes, lootCatalog)
    equipmentHealthByHero = computeEquipmentHealthByHero(equipmentHeroes, lootCatalog)
    equipmentGlobalDpsByHero = computeEquipmentGlobalDpsByHero(equipmentHeroes, lootCatalog)
    equipmentGoldByHero = computeEquipmentGoldByHero(equipmentHeroes, lootCatalog)
    equipmentCritByHero = computeEquipmentCritByHero(equipmentHeroes, lootCatalog)
    equipmentBuffsByHero = collectEquipmentBuffsByHero(equipmentHeroes, lootCatalog)
  }
  // feat 源 buff_upgrade wrapper（owned-aware，独立 of lootCatalog/装备路径）：合并进 equipmentBuffsByHero
  // 复用 applyEquipmentBuffsToProfile 反查通道（target 普通升级的 base signal）。仅 owned feat 装备才放大。
  if (hasOwnedHeroes) {
    const featBuffs = collectFeatBuffWrappersByHero(profileSnapshot.ownedHeroes, featCatalog)
    for (const [heroId, buffs] of featBuffs) {
      const existing = equipmentBuffsByHero.get(heroId)
      if (existing) {
        existing.push(...buffs)
      } else {
        equipmentBuffsByHero.set(heroId, [...buffs])
      }
    }
  }

  const effectDefTemplates = new Map(effectDefinitions.map((entry) => [entry.id, entry]))

  const active = profileSnapshot?.activeContext
  const patronMult = profileSnapshot?.patronPerks
    ? computeActualPatronPerkGlobalBuff(profileSnapshot.patronPerks, patronPerkCatalog, active?.patronId, effectDefTemplates)
    : 1
  const blessingMult = profileSnapshot?.blessings
    ? computeActualBlessingGlobalBuff(profileSnapshot.blessings.levels, profileSnapshot.blessings.catalog, active?.deity, effectDefTemplates)
    : 1
  const globalBuffMultiplier = combineGlobalBuffMultipliers([patronMult, blessingMult])

  let externalHeroDpsContributions: HeroDpsContribution[] = []
  if (profileSnapshot) {
    const patronEffects = profileSnapshot.patronPerks
      ? collectActivePatronPerkEffects(profileSnapshot.patronPerks, patronPerkCatalog, active?.patronId)
      : []
    const blessingEffects = profileSnapshot.blessings
      ? collectActiveBlessingEffects(profileSnapshot.blessings.levels, profileSnapshot.blessings.catalog, active?.deity)
      : []
    externalHeroDpsContributions = collectHeroDpsContributions([...patronEffects, ...blessingEffects], effectDefTemplates)
  }

  return { equipmentAdjustmentByHero, equipmentHealthByHero, equipmentGlobalDpsByHero, equipmentGoldByHero, equipmentCritByHero, equipmentBuffsByHero, globalBuffMultiplier, externalHeroDpsContributions }
}
