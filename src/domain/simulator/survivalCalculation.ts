import Decimal from 'break_eternity.js'

import type { ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import type { GameNumberValue } from './gameNumber'
import { compareGameNumbers } from './gameNumberArithmetic'

/**
 * 生存（survival）计算。阶段 5.2。
 *
 * effectiveHealth = baseHealth × healthLevelCurve(level) × healthPoolMultiplier。
 * - healthPoolMultiplier 由 placementFit 按 dimension:'survival' 聚合 health/healing signal
 *   （不含 damage_reduction；damage_reduction 是玩家侧减伤，单独作用于 incoming damage）。
 * - healthLevelCurve 用 healthCurves["1"]^level 近似（与 costCurves 同构，ponytail MVP 近似）。
 *
 * survival 作为推图约束（阶段 5.3 / 10）：effectiveHealth < monster_damage 则限制推图层数。
 */
const DEFAULT_HEALTH_CURVE_RATE = 1.06

/** healthCurves 缺失或非法时回退默认率（防御；生产数据带 healthCurves["1"]=1）。 */
function resolveHealthCurveRate(hero: ResolvedHeroAbilityProfile): number {
  const curves = hero.healthCurves
  const rate = curves?.['1'] ?? (curves ? Object.values(curves)[0] : undefined)
  return typeof rate === 'number' && rate > 0 ? rate : DEFAULT_HEALTH_CURVE_RATE
}

export function computeHealthLevelCurve(hero: ResolvedHeroAbilityProfile, level: number): GameNumberValue {
  return Decimal.pow(resolveHealthCurveRate(hero), Math.max(0, level))
}

export function computeEffectiveHealth(
  hero: ResolvedHeroAbilityProfile,
  level: number,
  healthPoolMultiplier: number,
): GameNumberValue {
  const baseHealth = hero.baseHealth > 0 ? hero.baseHealth : 1
  const levelCurve = computeHealthLevelCurve(hero, level)
  const mult = Number.isFinite(healthPoolMultiplier) && healthPoolMultiplier > 0 ? healthPoolMultiplier : 1
  return new Decimal(baseHealth).times(levelCurve).times(mult)
}

/**
 * survival 约束（阶段 5.3）：effectiveHealth 能否抵御单次怪物伤害。
 * IC 机制：单次伤害 ≥ 英雄当前生命 → 被秒杀，推图中断。damage_reduction 已在 incomingDamage 折算。
 * 推图层数限制的完整建模（effectiveHealth 随 area 缩放 vs monster_damage 增长）在阶段 10 接入；
 * 此处提供纯判定函数供 stage 10 消费。
 */
export function canSurviveBurst(
  effectiveHealth: GameNumberValue,
  incomingDamagePerHit: GameNumberValue,
): boolean {
  return compareGameNumbers(effectiveHealth, incomingDamagePerHit) >= 0
}
