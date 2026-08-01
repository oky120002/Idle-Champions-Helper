/**
 * 装配 scoring 入参的外部加成字段（装备 + patron perk + blessing）。
 *
 * 从 usePlannerPageModel 下沉为纯函数：无 React 依赖，hook 只 memoize 结果，
 * 解锁 React 外单测。三项分别由 simulator 的 equipment/globalBuff provider 与
 * buffs 的 externalHeroDpsMult provider 计算（#4 加成来源装配下沉）。
 *
 * - equipmentAdjustmentByHero：ownedHeroes.lootBySlot + loot-catalog → per-hero 装备调整比；
 *   未导入存档或 lootCatalog 空 → 空 map（scoreFormation 缺省 ?? 1，向后兼容）。
 * - equipmentHealthByHero：per-hero health_mult multiplier（hero-scoped 生命）；scoreFormation survival 段
 *   并入 carry 的 survival:hero 池；未导入存档 → 空 map。
 * - globalBuffMultiplier：patron + blessing + 装备 global_dps 的 add pool 合并（1 + Σ(value)/100）；
 *   effect_def,<id> 引用的 global_dps 经 effectDefTemplates 解引用计入；装备 global_dps 跨英雄全队聚合；
 *   未导入存档 → 1。
 * - externalHeroDpsContributions：patron/blessing 的 effect_def hero_dps（带 filter，per-carry 条件生效）；
 *   active 过滤复用 globalBuff 的 collect 单一来源（#7 type1 规则不漂移）；未导入存档 → 空。
 */

import { collectHeroDpsContributions } from '../buffs/externalHeroDpsMult'
import type { EffectDefinitionEntry } from '../buffs/effectDefinitionDps'
import type { HeroDpsContribution } from '../buffs/externalHeroDpsMult'
import { collectActiveBlessingEffects, combineGlobalBuffMultipliers, computeActualBlessingGlobalBuff } from '../buffs/blessingGlobalBuff'
import { computeEquipmentAdjustmentByHero, computeEquipmentGlobalDpsMult, computeEquipmentHealthByHero } from '../buffs/equipmentMult'
import { collectActivePatronPerkEffects, computeActualPatronPerkGlobalBuff } from '../buffs/patronPerkGlobalBuff'
import type { LootCatalogEntry } from '../buffs/equipmentMult'
import type { PatronPerkCatalogEntry } from '../buffs/patronPerkGlobalBuff'
import type { UserProfileSnapshot } from '../user-profile/types'

export interface ScoringBonusInputs {
  equipmentAdjustmentByHero: Map<string, number>
  equipmentHealthByHero: Map<string, number>
  globalBuffMultiplier: number
  externalHeroDpsContributions: HeroDpsContribution[]
}

export interface BuildScoringBonusInputsInput {
  profileSnapshot: UserProfileSnapshot | null
  lootCatalog: readonly LootCatalogEntry[]
  effectDefinitions: readonly EffectDefinitionEntry[]
  patronPerkCatalog: readonly PatronPerkCatalogEntry[]
}

export function buildScoringBonusInputs(input: BuildScoringBonusInputsInput): ScoringBonusInputs {
  const { profileSnapshot, lootCatalog, effectDefinitions, patronPerkCatalog } = input

  let equipmentAdjustmentByHero = new Map<string, number>()
  let equipmentHealthByHero = new Map<string, number>()
  let equipmentGlobalDpsMult = 1
  if (profileSnapshot && lootCatalog.length > 0) {
    equipmentAdjustmentByHero = computeEquipmentAdjustmentByHero(profileSnapshot.ownedHeroes, lootCatalog)
    equipmentHealthByHero = computeEquipmentHealthByHero(profileSnapshot.ownedHeroes, lootCatalog)
    equipmentGlobalDpsMult = computeEquipmentGlobalDpsMult(profileSnapshot.ownedHeroes, lootCatalog)
  }

  const effectDefTemplates = new Map(effectDefinitions.map((entry) => [entry.id, entry]))

  const active = profileSnapshot?.activeContext
  const patronMult = profileSnapshot?.patronPerks
    ? computeActualPatronPerkGlobalBuff(profileSnapshot.patronPerks, patronPerkCatalog, active?.patronId, effectDefTemplates)
    : 1
  const blessingMult = profileSnapshot?.blessings
    ? computeActualBlessingGlobalBuff(profileSnapshot.blessings.levels, profileSnapshot.blessings.catalog, active?.deity, effectDefTemplates)
    : 1
  const globalBuffMultiplier = combineGlobalBuffMultipliers([patronMult, blessingMult, equipmentGlobalDpsMult])

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

  return { equipmentAdjustmentByHero, equipmentHealthByHero, globalBuffMultiplier, externalHeroDpsContributions }
}
