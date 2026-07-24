import type { HeroAbilitySignal } from '../../src/domain/abilities/abilityModel'

/**
 * Patron-perk 全局加成解析（阶段 11.3）。
 *
 * 数据源：`patron-perks.json`（由 normalize-idle-champions-definitions 产出）。
 * 结构确认：`docs/modules/planner/m3-data-source-confirmations.md` §11.2。
 *
 * patron-perks 是阵型无关的全局 buff（per-patron，玩家选择 patron 后生效），
 * 不走 champion-details effect 管线（`$replace` + `per_level` 语义独立）。
 *
 * MVP 范围：只接 `global_dps_multiplier_mult,$replace`（21 条，无条件全局 DPS）。
 * - value = perLevel × maxLevels（满级理论值；存档裁剪留阶段 13）。
 * - amountFunc 缺省 = add（与 hero globalDpsMultiplier 同构：1 + Σ(value/100)）。
 * - `global_dps_multiplier_mult_area_tags,$replace,<tag>` 需场景 tag 匹配，留后续扩展。
 * - `effect_def,<id>` 引用（tag 限定 hero_dps）需英雄 tag 匹配，留后续扩展。
 */

export interface PatronPerkSignal {
  patronId: string
  signal: HeroAbilitySignal
}

interface RawPerkEffect {
  effectString?: unknown
  perLevel?: unknown
}

interface RawPerk {
  patronId?: unknown
  levels?: unknown
  effects?: unknown
}

const GLOBAL_DPS_EFFECT_STRING = 'global_dps_multiplier_mult,$replace'

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * 解析 patron-perks → per-patron patronPerkMult signals。
 * 只接无条件全局 DPS perk（`global_dps_multiplier_mult,$replace`）。
 */
export function parsePatronPerkSignals(perks: readonly RawPerk[]): PatronPerkSignal[] {
  const result: PatronPerkSignal[] = []

  for (const perk of perks) {
    const patronId = typeof perk.patronId === 'string' || typeof perk.patronId === 'number'
      ? String(perk.patronId)
      : ''
    if (!patronId) {
      continue
    }
    const maxLevels = toNumber(perk.levels) || 1
    const effects = Array.isArray(perk.effects) ? (perk.effects as RawPerkEffect[]) : []

    for (const effect of effects) {
      const effectString = typeof effect.effectString === 'string' ? effect.effectString : ''
      if (effectString !== GLOBAL_DPS_EFFECT_STRING) {
        continue
      }
      const perLevel = toNumber(effect.perLevel)
      if (perLevel <= 0) {
        continue
      }

      result.push({
        patronId,
        signal: {
          kind: 'patronPerkMult',
          value: perLevel * maxLevels,
          rawEffect: effectString,
          source: 'official-parsed',
        },
      })
    }
  }

  return result
}

/**
 * 全局 buff pool 聚合（阶段 11.4）：`1 + Σ(value/100)`（add 语义，与 damage pool 同构）。
 * 用于 final_dps × global_buff_pool。
 */
export function computeGlobalBuffMultiplier(signals: readonly HeroAbilitySignal[]): number {
  let addPercent = 0
  for (const signal of signals) {
    addPercent += signal.value
  }
  return 1 + addPercent / 100
}
