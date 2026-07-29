import { normalizeTargetQualifier } from '../abilities/signalSemantics'
import type { HeroQualifier } from '../abilities/abilityModel'
import {
  type ActiveCatalogEffect,
  type EffectDefinitionEntry,
  parseEffectKind,
  resolveEffectDefinitionKeys,
  resolveEffectKeyValue,
} from './effectDefinitionDps'

const HERO_DPS_KIND = 'hero_dps_multiplier_mult'

/** 一个带 filter 的 hero_dps 加成（per-carry 条件生效）。 */
export interface HeroDpsContribution {
  value: number
  qualifier: HeroQualifier | null
}

/**
 * 从 active catalog effects 收集 hero_dps per-carry 贡献（effect_def 解引用 + hero_dps 筛选 + filter 解析）。
 *
 * 裸 effect_string（非 effect_def 引用）不收——catalog 只存 global_dps + effect_def 引用，
 * 裸 hero_dps 属装备/技能（equipmentMult / hero-abilities 已接入）。
 *
 * filter 解析复用 signalSemantics.normalizeTargetQualifier（by_tags/stat/hero_ids/attack_type）。
 * 有 filter（filterTargets/targets 非空）但未解析成 qualifier（heroes/slots/col_num 等位置/范围限定）
 * → 保守丢弃，避免被当全局过度生效；无 filter → qualifier=null（对所有 carry 生效）。
 */
export function collectHeroDpsContributions(
  effects: readonly ActiveCatalogEffect[],
  templates: ReadonlyMap<string, EffectDefinitionEntry> | null,
): HeroDpsContribution[] {
  const out: HeroDpsContribution[] = []
  for (const effect of effects) {
    const keys = resolveEffectDefinitionKeys(effect.effectString, templates)
    if (!keys) {
      continue
    }
    for (const key of keys) {
      if (parseEffectKind(key.effectString) !== HERO_DPS_KIND) {
        continue
      }
      const value = resolveEffectKeyValue(key.effectString, effect.perLevel, effect.level)
      if (value <= 0) {
        continue
      }
      const hasRawFilter = key.filterTargets.length > 0 || key.targets.length > 0
      const qualifier = normalizeTargetQualifier({ filter_targets: key.filterTargets, targets: key.targets })
      // 有 filter 但未解析 → 保守丢弃（heroes/slots 等位置/范围限定，避免被当全局过度生效）。
      if (hasRawFilter && !qualifier) {
        continue
      }
      out.push({ value, qualifier })
    }
  }
  return out
}
