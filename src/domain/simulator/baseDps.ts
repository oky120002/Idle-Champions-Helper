import Decimal from 'break_eternity.js'

import type { ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import type { GameNumberValue } from './gameNumber'

/**
 * 单英雄 carry DPS：baseDamage × levelCurve(level) × aggregate。
 *
 * ponytail: levelCurve 用 costCurves[1]^level 近似（cost 曲线 ≈ DPS 增长上界）。
 * 绝对值偏高但相对比较保序；阶段 7 BUD 建模时接入官方 DPS 增长曲线精确化。
 * 详见 docs/modules/planner/carry-dps-formula-spike.md。
 */

const DEFAULT_COST_CURVE_RATE = 1.06

/**
 * ponytail: hero-abilities.json 暂未持久化 costCurves；统一用默认率。
 * 后续从 champion-details 写入 costCurves 后改读 hero.costCurveRate（保留 hero 入参占位）。
 */
function resolveLevelCurveRate(hero: ResolvedHeroAbilityProfile | undefined): number {
  void hero
  return DEFAULT_COST_CURVE_RATE
}

export function computeLevelCurve(hero: ResolvedHeroAbilityProfile, level: number): GameNumberValue {
  const rate = resolveLevelCurveRate(hero)
  return Decimal.pow(rate, Math.max(0, level))
}

export function computeCarryDps(
  hero: ResolvedHeroAbilityProfile,
  level: number,
  damageAggregate: number,
): GameNumberValue {
  const baseDamage = hero.baseDamage > 0 ? hero.baseDamage : 1
  const levelCurve = computeLevelCurve(hero, level)
  const aggregate = Number.isFinite(damageAggregate) && damageAggregate > 0 ? damageAggregate : 1
  return new Decimal(baseDamage).times(levelCurve).times(aggregate)
}
