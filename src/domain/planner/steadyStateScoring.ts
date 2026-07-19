import Decimal from 'break_eternity.js'

import type { ResolvedPlannerHeroModel, ResolvedPlannerScenarioModel } from './plannerModel'
import { evaluatePlacementFit } from './placementFit'
import type { ObjectiveResult } from './objectiveModel'
import { computeCarryDps } from '../simulator/baseDps'
import type { GameNumberValue } from '../simulator/gameNumber'
import { compareGameNumbers } from '../simulator/gameNumberArithmetic'

const DEFAULT_CARRY_LEVEL = 1

export interface ScoringInput {
  placements: Record<string, string>
  heroesById: Map<string, ResolvedPlannerHeroModel>
  scenario: ResolvedPlannerScenarioModel
  heroLevels?: Map<string, number>
}

export interface ScoringResult {
  score: GameNumberValue
  warnings: string[]
  explanations: string[]
  carryHeroId: string | null
  objective: ObjectiveResult
}

const ZERO: GameNumberValue = new Decimal(0)

export function scoreFormation(input: ScoringInput): ScoringResult {
  const placedEntries = Object.entries(input.placements)
    .map(([slotId, heroId]) => {
      const hero = input.heroesById.get(heroId)
      return hero ? { slotId, hero } : null
    })
    .filter((entry): entry is { slotId: string; hero: ResolvedPlannerHeroModel } => Boolean(entry))

  if (placedEntries.length === 0) {
    return {
      score: ZERO,
      warnings: [],
      explanations: [],
      carryHeroId: null,
      objective: { value: ZERO, breakdown: [] },
    }
  }

  // v2.1③: 去除 isCarryViable 的 dps 角色判定——所有已放置英雄作为 carry 候选，让 carryDps 决定。
  const effectiveCarryCandidates = placedEntries

  let bestScore: GameNumberValue = ZERO
  let bestWarnings: string[] = []
  let bestExplanations: string[] = []
  let bestCarryHeroId: string | null = null

  for (const carryEntry of effectiveCarryCandidates) {
    const carryLevel = input.heroLevels?.get(carryEntry.hero.heroId) ?? DEFAULT_CARRY_LEVEL
    const warnings = [...carryEntry.hero.unsupportedSignals.map((signal) => `${signal.rawEffect}: ${signal.note}`)]
    const explanations: string[] = []
    let aggregate = 1

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

      aggregate *= fit.totalMultiplier
      warnings.push(...fit.warnings)

      for (const part of fit.scoreBreakdown) {
        if (!part.active) {
          continue
        }

        explanations.push(
          `${supportEntry.hero.heroId}: ${part.signalKind} x${part.multiplier.toFixed(2)} -> ${carryEntry.hero.heroId}`,
        )
      }
    }

    const carryDps = computeCarryDps(carryEntry.hero, carryLevel, aggregate)

    if (compareGameNumbers(carryDps, bestScore) > 0) {
      bestScore = carryDps
      bestWarnings = [...new Set(warnings)]
      bestExplanations = explanations
      bestCarryHeroId = carryEntry.hero.heroId
    }
  }

  return {
    score: bestScore,
    warnings: bestWarnings,
    explanations: bestExplanations,
    carryHeroId: bestCarryHeroId,
    objective: {
      value: bestScore,
      breakdown: bestCarryHeroId
        ? [{ label: `carryDps:${bestCarryHeroId}`, value: bestScore }]
        : [],
    },
  }
}
