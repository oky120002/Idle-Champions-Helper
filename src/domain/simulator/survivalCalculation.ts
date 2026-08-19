import { toGameNumber, type GameNumberValue } from '../gameNumber'

import type { ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import { assertValidLevel } from './baseDps'

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
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_HEALTH_CURVE_RATE
}

export function computeHealthLevelCurve(hero: ResolvedHeroAbilityProfile, level: number): GameNumberValue {
  assertValidLevel(level)
  return toGameNumber(resolveHealthCurveRate(hero)).pow(level)
}

export function computeEffectiveHealth(
  hero: ResolvedHeroAbilityProfile,
  level: number,
  healthPoolMultiplier: number,
): GameNumberValue {
  if (!Number.isFinite(hero.baseHealth) || hero.baseHealth <= 0) {
    throw new Error(`baseHealth must be a finite positive number, got ${String(hero.baseHealth)}`)
  }
  if (!Number.isFinite(healthPoolMultiplier) || healthPoolMultiplier < 0) {
    throw new Error(`healthPoolMultiplier must be a finite non-negative number, got ${String(healthPoolMultiplier)}`)
  }
  const levelCurve = computeHealthLevelCurve(hero, level)
  return toGameNumber(hero.baseHealth).mul(levelCurve).mul(healthPoolMultiplier)
}
