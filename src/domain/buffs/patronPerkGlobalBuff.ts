/**
 * Patron perk 实际等级的全局 DPS 加成（actual level，非满级理论值）。
 *
 * 数据源：`patron-perks.json`（定义：perk_id → effects/perLevel）+
 * `userdetails.details.patron_perks`（actual level：perk_id → level）。
 *
 * 只接 `global_dps_multiplier_mult`（无条件全局 DPS）：裸 `,$replace` 与 `effect_def,<id>` 引用
 * （后者解引用 effect-definitions.json template 筛 global_dps kind；hero_dps kind 不计入 globalBuff，
 * 由 externalHeroDpsMult per-carry 处理）。value = perLevel × actualLevel（$replace）或固定值；
 * globalBuff = 1 + Σ(value)/100（add 语义，与 blessingGlobalBuff 同构——两者同属 global_dps add pool）。
 * 未购买（level=0/缺）或非 global_dps effect → 不计。
 * 未导入存档（actualLevels=null/空）→ 1（无加成，向后兼容）。
 *
 * area_tags 条件版（hellish/underground）留后续（需场景 tag 匹配）。
 */

import {
  type ActiveCatalogEffect,
  type EffectDefinitionEntry,
  parseEffectKind,
  resolveEffectDefinitionKeys,
  resolveEffectKeyValue,
} from './effectDefinitionDps'

export interface PatronPerkCatalogEntry {
  id: string
  /** 所属赞助者 id。 */
  patronId: string
  /** 1=本地（仅 active patron 生效）/ 2=全局（恒生效）。 */
  typeId: number
  effects: ReadonlyArray<{ effectString: string; perLevel: number }>
}

const GLOBAL_DPS_KIND = 'global_dps_multiplier_mult'

/**
 * 收集 active patron perk 的 catalog effects（typeId=1 仅 active patron / typeId=2 恒生效）+ actual level。
 * active 过滤单一来源：globalBuff（global_dps）与 externalHeroDpsMult（hero_dps per-carry）复用，
 * 避免 #7 的 type1 过滤规则在两处漂移。未导入存档（null）→ 空。
 */
export function collectActivePatronPerkEffects(
  actualLevels: Readonly<Record<string, number>> | null,
  perks: readonly PatronPerkCatalogEntry[],
  activePatronId?: string | number | null,
): ActiveCatalogEffect[] {
  if (!actualLevels) {
    return []
  }
  const active = activePatronId != null && activePatronId !== '' ? String(activePatronId) : null
  const out: ActiveCatalogEffect[] = []
  for (const perk of perks) {
    if (perk.typeId === 1 && active !== null && perk.patronId !== active) {
      continue
    }
    const level = actualLevels[perk.id] ?? 0
    if (level <= 0) {
      continue
    }
    for (const effect of perk.effects) {
      out.push({ effectString: effect.effectString, perLevel: effect.perLevel, level })
    }
  }
  return out
}

/**
 * 算 actual patron perk globalBuffMultiplier（用户实际购买等级）。
 * - actualLevels: perk_id → level（来自 snapshot.patronPerks）。
 * - perks: patron-perks.json 的 catalog。
 * - activePatronId: active instance 的 current_patron_id（来自 snapshot.activeContext）。
 *   typeId=1（本地增益）仅 patronId === activePatronId 生效；typeId=2（全局）恒生效。
 *   缺省/null → 不过滤（全算，向后兼容/未导入存档）。
 * - effectDefTemplates：effect-definitions.json 的 id → template（解引用 `effect_def,<id>`）；
 *   缺省 → 只算裸 `global_dps_multiplier_mult,$replace`（向后兼容）。
 * - 返回 1 + Σ(value)/100，只计 global_dps_multiplier_mult。
 */
export function computeActualPatronPerkGlobalBuff(
  actualLevels: Readonly<Record<string, number>> | null,
  perks: readonly PatronPerkCatalogEntry[],
  activePatronId?: string | number | null,
  effectDefTemplates?: ReadonlyMap<string, EffectDefinitionEntry> | null,
): number {
  const effects = collectActivePatronPerkEffects(actualLevels, perks, activePatronId)
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
