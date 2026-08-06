import { toGameNumber, type GameNumberValue } from '../gameNumber'

import type { ResolvedHeroAbilityProfile } from '../abilities/abilityModel'

/**
 * 单英雄 carry DPS：baseDamage × levelCurve(level) × aggregate。
 *
 * ponytail: levelCurve 用 costCurves["1"]^level 近似（cost 曲线 ≈ DPS 增长上界）。
 * 绝对值偏高但相对比较保序；BUD 建模时接入官方 DPS 增长曲线精确化。
 * BUD 对阵型模拟的价值与近似取舍见 docs/research/data/planner/bud-calibration.md。
 */

const DEFAULT_COST_CURVE_RATE = 1.06

/** costCurves 缺失或非法时回退默认率（防御；生产数据全部英雄均带 costCurves["1"]）。 */
function resolveLevelCurveRate(hero: ResolvedHeroAbilityProfile): number {
  const curves = hero.costCurves
  const rate = curves?.['1'] ?? (curves ? Object.values(curves)[0] : undefined)
  return typeof rate === 'number' && rate > 0 ? rate : DEFAULT_COST_CURVE_RATE
}

export function computeLevelCurve(hero: ResolvedHeroAbilityProfile, level: number): GameNumberValue {
  return toGameNumber(resolveLevelCurveRate(hero)).pow(Math.max(0, level))
}

export function computeCarryDps(
  hero: ResolvedHeroAbilityProfile,
  level: number,
  damageAggregate: number,
): GameNumberValue {
  const baseDamage = hero.baseDamage > 0 ? hero.baseDamage : 1
  const levelCurve = computeLevelCurve(hero, level)
  const aggregate = Number.isFinite(damageAggregate) && damageAggregate > 0 ? damageAggregate : 1
  return toGameNumber(baseDamage).mul(levelCurve).mul(aggregate)
}
