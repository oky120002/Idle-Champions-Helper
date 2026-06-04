import type { ResolvedPlannerHeroModel, ResolvedPlannerScenarioModel } from './plannerModel'
import { evaluatePlacementFit } from './placementFit'

export interface ScoringInput {
  placements: Record<string, string>
  heroesById: Map<string, ResolvedPlannerHeroModel>
  scenario: ResolvedPlannerScenarioModel
}

export interface ScoringResult {
  score: number
  warnings: string[]
  explanations: string[]
  carryHeroId: string | null
}

export function scoreFormation(input: ScoringInput): ScoringResult {
  const placedEntries = Object.entries(input.placements)
    .map(([slotId, heroId]) => {
      const hero = input.heroesById.get(heroId)
      return hero ? { slotId, hero } : null
    })
    .filter((entry): entry is { slotId: string; hero: ResolvedPlannerHeroModel } => Boolean(entry))

  if (placedEntries.length === 0) {
    return {
      score: 0,
      warnings: [],
      explanations: [],
      carryHeroId: null,
    }
  }

  const carryCandidates = placedEntries.filter((entry) => entry.hero.isCarryViable)
  const effectiveCarryCandidates = carryCandidates.length > 0 ? carryCandidates : placedEntries

  let bestScore = 0
  let bestWarnings: string[] = []
  let bestExplanations: string[] = []
  let bestCarryHeroId: string | null = null

  for (const carryEntry of effectiveCarryCandidates) {
    let score = carryEntry.hero.heuristicRoleMultiplier
    const warnings = [...carryEntry.hero.unsupportedSignals.map((signal) => `${signal.rawEffect}: ${signal.note}`)]
    const explanations = [
      `${carryEntry.hero.heroId}: carry baseline x${carryEntry.hero.heuristicRoleMultiplier} (${carryEntry.hero.sourceBreakdown.heuristicRoleMultiplier})`,
    ]

    for (const supportEntry of placedEntries) {
      const fit = evaluatePlacementFit({
        carryHero: carryEntry.hero,
        carrySlotId: carryEntry.slotId,
        supportHero: supportEntry.hero,
        supportSlotId: supportEntry.slotId,
        scenario: input.scenario,
      })

      score *= fit.fitScore
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

    if (score > bestScore) {
      bestScore = score
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
  }
}
