import Decimal from 'decimal.js'

import type { ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import type { GameNumberValue } from './gameNumber'

/**
 * 生存（survival）计算。
 *
 * effectiveHealth = baseHealth × healthLevelCurve(level) × healthPoolMultiplier。
 * - healthPoolMultiplier 由 placementFit 按 dimension:'survival' 聚合 health/healing signal
 *   （不含 damage_reduction；damage_reduction 是玩家侧减伤，单独作用于 incoming damage）。
 * - healthLevelCurve 用 healthCurves["1"]^level 近似（与 costCurves 同构，ponytail MVP 近似）。
 *
 * survival 作为推图约束：推图层数预估（areaEstimation）拿 effectiveHealth
 * 与怪物伤害二分求 survivableArea。绝对值未校准（怪物伤害用 dps 近似单次伤害，见 areaEstimation）。
 */
const DEFAULT_HEALTH_CURVE_RATE = 1.06

/** healthCurves 缺失或非法时回退默认率（防御；生产数据带 healthCurves["1"]=1）。 */
function resolveHealthCurveRate(hero: ResolvedHeroAbilityProfile): number {
  const curves = hero.healthCurves
  const rate = curves?.['1'] ?? (curves ? Object.values(curves)[0] : undefined)
  return typeof rate === 'number' && rate > 0 ? rate : DEFAULT_HEALTH_CURVE_RATE
}

export function computeHealthLevelCurve(hero: ResolvedHeroAbilityProfile, level: number): GameNumberValue {
  return new Decimal(resolveHealthCurveRate(hero)).pow(Math.max(0, level))
}

export function computeEffectiveHealth(
  hero: ResolvedHeroAbilityProfile,
  level: number,
  healthPoolMultiplier: number,
): GameNumberValue {
  const baseHealth = hero.baseHealth > 0 ? hero.baseHealth : 1
  const levelCurve = computeHealthLevelCurve(hero, level)
  const mult = Number.isFinite(healthPoolMultiplier) && healthPoolMultiplier > 0 ? healthPoolMultiplier : 1
  return new Decimal(baseHealth).mul(levelCurve).mul(mult)
}
