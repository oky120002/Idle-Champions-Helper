/**
 * Patron perk 实际等级的全局 DPS 加成（actual level，非满级理论值）。
 *
 * 数据源：`patron-perks.json`（定义：perk_id → effects/perLevel）+
 * `userdetails.details.patron_perks`（actual level：perk_id → level）。
 *
 * 只接 `global_dps_multiplier_mult,$replace`（21 条无条件全局 DPS）。
 * value = perLevel × actualLevel；globalBuff = 1 + Σ(value)/100（add 语义，
 * 与 patron-perk-signals.ts 的 computeGlobalBuffMultiplier 同构）。
 * 未购买（level=0/缺）或非 global_dps effect → 不计。
 * 未导入存档（actualLevels=null/空）→ 1（无加成，向后兼容）。
 *
 * area_tags 条件版（hellish/underground）与 effect_def 引用留后续（需场景/英雄 tag 匹配）。
 */

export interface PatronPerkCatalogEntry {
  id: string
  /** 所属赞助者 id。 */
  patronId: string
  /** 1=本地（仅 active patron 生效）/ 2=全局（恒生效）。 */
  typeId: number
  effects: ReadonlyArray<{ effectString: string; perLevel: number }>
}

const GLOBAL_DPS_EFFECT_STRING = 'global_dps_multiplier_mult,$replace'

/**
 * 算 actual patron perk globalBuffMultiplier（用户实际购买等级）。
 * - actualLevels: perk_id → level（来自 snapshot.patronPerks）。
 * - perks: patron-perks.json 的 catalog。
 * - activePatronId: active instance 的 current_patron_id（来自 snapshot.activeContext）。
 *   typeId=1（本地增益）仅 patronId === activePatronId 生效；typeId=2（全局）恒生效。
 *   缺省/null → 不过滤（全算，向后兼容/未导入存档）。
 * - 返回 1 + Σ(perLevel × actualLevel)/100，只计 global_dps_multiplier_mult。
 */
export function computeActualPatronPerkGlobalBuff(
  actualLevels: Readonly<Record<string, number>> | null,
  perks: readonly PatronPerkCatalogEntry[],
  activePatronId?: string | number | null,
): number {
  if (!actualLevels) {
    return 1
  }
  const active = activePatronId != null && activePatronId !== '' ? String(activePatronId) : null
  let addPercent = 0
  for (const perk of perks) {
    // typeId=1（本地增益）仅 active patron；typeId=2（全局）恒生效
    if (perk.typeId === 1 && active !== null && perk.patronId !== active) {
      continue
    }
    const level = actualLevels[perk.id] ?? 0
    if (level <= 0) {
      continue
    }
    for (const effect of perk.effects) {
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
