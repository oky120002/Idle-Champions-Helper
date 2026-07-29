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
 * crit_factor：1 + total_chance × (total_damage_mult − 1)，基线归一化。
 * - 无 crit signal → 1.0（base crit 在归一中抵消，保持非 crit 阵型 carryDps 不变）。
 * - base chance(2.5%) 始终参与，使「纯 damage buff」类 crit signal 有效（否则 chance=0 无暴击）。
 * - ponytail/BUD 局限：crit 期望值在 BUD 机制下低估，MVP 可接受；绝对值偏差由归一基线吸收。
 *
 * amountFunc 分流：add 类（缺省）的 multiplier=1+percent/100 → 反推 percent 累加；
 * mult 类累乘。chance/damage 各自独立聚合后合成期望。
 */
export function computeCritFactor(parts: PlacementFitScorePart[]): number {
  let chanceAddPercent = 0
  let chanceMult = 1
  let damageAddPercent = 0
  let damageMult = 1
  let hasCrit = false

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
    hasCrit = true
  }

  if (!hasCrit) {
    return 1
  }

  const totalChanceFraction = ((DEFAULT_CRIT_CHANCE_PERCENT + chanceAddPercent) * chanceMult) / 100
  const totalDamageMult = 1 + ((DEFAULT_CRIT_DAMAGE_PERCENT + damageAddPercent) * damageMult) / 100
  const rawCritFactor = 1 + totalChanceFraction * (totalDamageMult - 1)
  return rawCritFactor / BASE_CRIT_FACTOR
}
