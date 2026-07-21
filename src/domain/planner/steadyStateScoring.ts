import Decimal from 'break_eternity.js'

import type { ResolvedPlannerScenarioModel } from './plannerModel'
import type { HeroAbilityKind, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import { evaluatePlacementFit, type AggregatedPool } from './placementFit'
import type { ObjectiveResult } from './objectiveModel'
import { computeCarryDps } from '../simulator/baseDps'
import type { GameNumberValue } from '../simulator/gameNumber'
import { compareGameNumbers } from '../simulator/gameNumberArithmetic'

// 无 profile（用户未导入存档）或英雄不在 ownedHeroes 时 carryLevel 回退 1。
// 此处 levelCurve = rate^1 = 英雄自身 costCurve rate（约 1.05–1.1），carryDps 仍含英雄间
// 增长率差异但无法反映高等级 scale；属 MVP 近似（evolution-plan「BUD 对阵型模拟的价值」），
// 精确化依赖 profile heroLevels + 阶段 7 官方 DPS 增长曲线。
const DEFAULT_CARRY_LEVEL = 1

export interface ScoringInput {
  placements: Record<string, string>
  heroesById: Map<string, ResolvedHeroAbilityProfile>
  scenario: ResolvedPlannerScenarioModel
  heroLevels?: Map<string, number>
}

export interface ScoringResult {
  score: GameNumberValue
  warnings: string[]
  explanations: string[]
  carryHeroId: string | null
  objective: ObjectiveResult
  /** best carry 的 active signal kind 集合，供叙事层结构化消费（避免字符串匹配）。 */
  activeSignalKinds: Set<HeroAbilityKind>
}

const ZERO: GameNumberValue = new Decimal(0)

export function scoreFormation(input: ScoringInput): ScoringResult {
  const placedEntries = Object.entries(input.placements)
    .map(([slotId, heroId]) => {
      const hero = input.heroesById.get(heroId)
      return hero ? { slotId, hero } : null
    })
    .filter((entry): entry is { slotId: string; hero: ResolvedHeroAbilityProfile } => Boolean(entry))

  if (placedEntries.length === 0) {
    return {
      score: ZERO,
      warnings: [],
      explanations: [],
      carryHeroId: null,
      objective: { value: ZERO, breakdown: [] },
      activeSignalKinds: new Set(),
    }
  }

  let bestScore: GameNumberValue = ZERO
  let bestWarnings: string[] = []
  let bestExplanations: string[] = []
  let bestCarryHeroId: string | null = null
  let bestActiveKinds: Set<HeroAbilityKind> = new Set()

  for (const carryEntry of placedEntries) {
    const carryLevel = input.heroLevels?.get(carryEntry.hero.heroId) ?? DEFAULT_CARRY_LEVEL
    const warnings = [...carryEntry.hero.unsupportedSignals.map((signal) => `${signal.rawEffect}: ${signal.note}`)]
    const explanations: string[] = []
    const activeKinds = new Set<HeroAbilityKind>()
    // pool 在整队层面聚合：同一 dimension:scope 的 pool 跨所有支持位合并
    // （addPercent 相加、multFactor 相乘），pool 间再相乘。
    // 不能按支持位独立 pool 乘积再相乘——那会把不同位向同一 pool 的 additive 贡献变成累乘。
    const sharedPools = new Map<string, AggregatedPool>()

    for (const supportEntry of placedEntries) {
      const fit = evaluatePlacementFit({
        carryHero: carryEntry.hero,
        carrySlotId: carryEntry.slotId,
        supportHero: supportEntry.hero,
        supportSlotId: supportEntry.slotId,
        scenario: input.scenario,
        placements: input.placements,
        heroesById: input.heroesById,
      })

      warnings.push(...fit.warnings)

      for (const part of fit.scoreBreakdown) {
        if (!part.active) {
          continue
        }

        activeKinds.add(part.signalKind)
        explanations.push(
          `${supportEntry.hero.heroId}: ${part.signalKind} x${part.multiplier.toFixed(2)} -> ${carryEntry.hero.heroId}`,
        )
      }

      for (const pool of fit.pools) {
        const key = `${pool.dimension}:${pool.scope}`
        const merged = sharedPools.get(key) ?? {
          dimension: pool.dimension,
          scope: pool.scope,
          addPercent: 0,
          multFactor: 1,
          poolMultiplier: 1,
        }
        merged.addPercent += pool.addPercent
        merged.multFactor *= pool.multFactor
        merged.poolMultiplier = (1 + merged.addPercent / 100) * merged.multFactor
        sharedPools.set(key, merged)
      }
    }

    let aggregate = 1
    for (const pool of sharedPools.values()) {
      aggregate *= pool.poolMultiplier
    }

    const carryDps = computeCarryDps(carryEntry.hero, carryLevel, aggregate)

    if (compareGameNumbers(carryDps, bestScore) > 0) {
      bestScore = carryDps
      bestWarnings = [...new Set(warnings)]
      bestExplanations = explanations
      bestCarryHeroId = carryEntry.hero.heroId
      bestActiveKinds = activeKinds
    }
  }

  return {
    score: bestScore,
    warnings: bestWarnings,
    explanations: bestExplanations,
    carryHeroId: bestCarryHeroId,
    activeSignalKinds: bestActiveKinds,
    objective: {
      value: bestScore,
      breakdown: bestCarryHeroId
        ? [{ label: `carryDps:${bestCarryHeroId}`, value: bestScore }]
        : [],
    },
  }
}
