import type { ScoringResult } from './steadyStateScoring'
import type { HeroAbilityKind } from '../abilities/abilityModel'
import type { GameNumberValue } from '../simulator/gameNumber'
import { compareGameNumbers } from '../simulator/gameNumberArithmetic'

export interface BeamSearchInput {
  heroes: Array<{ heroId: string; seat: number }>
  slots: string[]
  beamWidth: number
  scoreFormation: (placements: Record<string, string>) => ScoringResult
}

export interface BeamSearchResult {
  score: GameNumberValue
  placements: Record<string, string>
  explanations: string[]
  warnings: string[]
  carryHeroId: string | null
  activeSignalKinds: Set<HeroAbilityKind>
}

interface BeamCandidate {
  placements: Record<string, string>
  usedHeroes: Set<string>
  usedSeats: Set<number>
}

export function beamSearch(input: BeamSearchInput): BeamSearchResult[] {
  const { heroes, slots, beamWidth, scoreFormation } = input

  let candidates: BeamCandidate[] = [
    { placements: {}, usedHeroes: new Set(), usedSeats: new Set() },
  ]

  for (const slot of slots) {
    const nextCandidates: BeamCandidate[] = []

    for (const candidate of candidates) {
      for (const hero of heroes) {
        if (candidate.usedHeroes.has(hero.heroId)) continue
        if (candidate.usedSeats.has(hero.seat)) continue

        const nextPlacements = { ...candidate.placements, [slot]: hero.heroId }
        nextCandidates.push({
          placements: nextPlacements,
          usedHeroes: new Set([...candidate.usedHeroes, hero.heroId]),
          usedSeats: new Set([...candidate.usedSeats, hero.seat]),
        })
      }
    }

    // Score and prune to beam width
    const scored = nextCandidates
      .map((c) => ({
        candidate: c,
        result: scoreFormation(c.placements),
      }))
      .sort((a, b) => compareGameNumbers(b.result.score, a.result.score))

    candidates = scored.slice(0, beamWidth).map((s) => s.candidate)
  }

  // Final scoring and ranking
  return candidates
    .map((c) => {
      const result = scoreFormation(c.placements)
      return {
        score: result.score,
        placements: c.placements,
        explanations: result.explanations,
        warnings: result.warnings,
        carryHeroId: result.carryHeroId,
        activeSignalKinds: result.activeSignalKinds,
      }
    })
    .sort((a, b) => compareGameNumbers(b.score, a.score))
}
