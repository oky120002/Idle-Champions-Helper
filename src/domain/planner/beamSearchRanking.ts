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

  const initialCandidate: BeamCandidate = {
    placements: {},
    usedHeroes: new Set(),
    usedSeats: new Set(),
  }
  let candidates: BeamCandidate[] = [initialCandidate]
  // scored 持有最近一轮评分结果；循环结束即最终候选的评分，收口直接复用，
  // 不再对最后一轮已评分的候选重复跑 scoreFormation（每次全阵型 O(N²×signals)）。
  let scored: Array<{ candidate: BeamCandidate; result: ScoringResult }> = [
    { candidate: initialCandidate, result: scoreFormation({}) },
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
    scored = nextCandidates
      .map((c) => ({
        candidate: c,
        result: scoreFormation(c.placements),
      }))
      .sort((a, b) => compareGameNumbers(b.result.score, a.result.score))
      .slice(0, beamWidth)

    candidates = scored.map((s) => s.candidate)
  }

  return scored
    .map((s) => ({
      score: s.result.score,
      placements: s.candidate.placements,
      explanations: s.result.explanations,
      warnings: s.result.warnings,
      carryHeroId: s.result.carryHeroId,
      activeSignalKinds: s.result.activeSignalKinds,
    }))
    .sort((a, b) => compareGameNumbers(b.score, a.score))
}
