import type { HeroAbilityKind } from '../../abilities/abilityModel'
import type { PlacementFitScorePart } from '../placementFit'

// crit_factor 默认值来自 default_crit_info（游戏全局）：chance 2.5%，crit damage +100%（×2）。
const DEFAULT_CRIT_CHANCE_PERCENT = 2.5
const DEFAULT_CRIT_DAMAGE_PERCENT = 100
// 基线 raw crit factor（无任何 crit signal 时）：1 + 0.025 × (2−1) = 1.025。
const BASE_CRIT_FACTOR = 1
  + (DEFAULT_CRIT_CHANCE_PERCENT / 100)
  * (1 + DEFAULT_CRIT_DAMAGE_PERCENT / 100 - 1)

const CRIT_CHANCE_KINDS: ReadonlySet<HeroAbilityKind> = new Set<HeroAbilityKind>([
  'globalCritChance',
  'heroCritChance',
])

/**
 * crit_factor：1 + total_chance × (total_damage_mult − 1)，基线归一化（锚=全局默认 2.5% base）。
 * - base crit chance 默认 2.5%（default_crit_info），per-hero 可被 set_base_crit_chance SET 覆盖（如 20%）。
 * - 默认 base 无 crit signal → 1.0（归一抵消，非 crit 阵型 carryDps 不变）；
 *   per-hero 覆盖 base 无 signal 时保留其 innate 暴击期望（20% → ~1.171），使暴击流 carry 排序正确。
 * - ponytail/BUD 局限：crit 期望值在 BUD 机制下低估，MVP 可接受；绝对值偏差由归一基线吸收。
 *
 * amountFunc 分流：add 类（缺省）的 multiplier=1+percent/100 → 反推 percent 累加；
 * mult 类累乘。chance/damage 各自独立聚合后合成期望。
 */
export function computeCritFactor(
  parts: PlacementFitScorePart[],
  baseCritChancePercent?: number | null,
  /** 装备 per-carry crit mult（hero-scope buff_base_crit_*_mult，B1-d）；null/缺省 = 无装备 crit。 */
  equipmentCrit?: { chanceMult: number; damageMult: number } | null,
): number {
  const baseChancePercent = baseCritChancePercent ?? DEFAULT_CRIT_CHANCE_PERCENT
  let chanceAddPercent = 0
  let chanceMult = 1
  let damageAddPercent = 0
  let damageMult = 1

  for (const part of parts) {
    if (!part.active) {
      continue
    }
    const isChance = CRIT_CHANCE_KINDS.has(part.signalKind)
    if (part.amountFunc === 'mult') {
      if (isChance) {
        chanceMult *= part.multiplier
      } else {
        damageMult *= part.multiplier
      }
    } else {
      // add：evaluatePlacementFit 折算 multiplier = 1 + percent/100 → percent = (multiplier−1)×100
      const percent = (part.multiplier - 1) * 100
      if (isChance) {
        chanceAddPercent += percent
      } else {
        damageAddPercent += percent
      }
    }
  }

  // 装备 crit（hero-scope mult，per-carry）：chance/damage 各自乘 mult，独立于 ability critParts（B1-d）。
  if (equipmentCrit) {
    chanceMult *= equipmentCrit.chanceMult
    damageMult *= equipmentCrit.damageMult
  }

  const totalChanceFraction = ((baseChancePercent + chanceAddPercent) * chanceMult) / 100
  const totalDamageMult = 1 + ((DEFAULT_CRIT_DAMAGE_PERCENT + damageAddPercent) * damageMult) / 100
  const rawCritFactor = 1 + totalChanceFraction * (totalDamageMult - 1)
  return rawCritFactor / BASE_CRIT_FACTOR
}
