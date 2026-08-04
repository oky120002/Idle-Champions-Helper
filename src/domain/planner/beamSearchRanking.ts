import type { AreaEstimationResult } from '../simulator/areaEstimation'
import type { HeroAbilityKind } from '../abilities/abilityModel'
import { compareGameNumbers, type GameNumberValue } from '../simulator/gameNumber'
import type { ScoringResult, SimulationBreakdown } from './steadyStateScoring'

export interface BeamSearchInput {
  heroes: Array<{ heroId: string; seat: number }>
  slots: string[]
  beamWidth: number
  scoreFormation: (placements: Record<string, string>) => ScoringResult
  /** 用户锁定的预填槽位（slotId→heroId），初始 candidate 已占用且不被搜索替换。 */
  lockedPlacements?: Record<string, string>
}

export interface BeamSearchResult {
  objectiveValue: GameNumberValue
  placements: Record<string, string>
  warnings: string[]
  carryHeroId: string | null
  activeSignalKinds: Set<HeroAbilityKind>
  areaEstimate?: AreaEstimationResult | null
  /** best carry 的结构化加成拆解（透传给 PlannerResult，供 UI/CLI 消费）。 */
  breakdown: SimulationBreakdown | null
}

interface BeamCandidate {
  placements: Record<string, string>
  usedHeroes: Set<string>
  usedSeats: Set<number>
}

function expandCandidates(
  candidates: BeamCandidate[],
  heroes: Array<{ heroId: string; seat: number }>,
  slot: string,
): BeamCandidate[] {
  const nextCandidates: BeamCandidate[] = []
  for (const candidate of candidates) {
    for (const hero of heroes) {
      if (candidate.usedHeroes.has(hero.heroId)) continue
      if (candidate.usedSeats.has(hero.seat)) continue

      nextCandidates.push({
        placements: { ...candidate.placements, [slot]: hero.heroId },
        usedHeroes: new Set([...candidate.usedHeroes, hero.heroId]),
        usedSeats: new Set([...candidate.usedSeats, hero.seat]),
      })
    }
  }
  return nextCandidates
}

export function beamSearch(input: BeamSearchInput): BeamSearchResult[] {
  const { heroes, slots, beamWidth, scoreFormation } = input

  const lockedPlacements = input.lockedPlacements ?? {}
  const lockedHeroIds = Object.values(lockedPlacements)
  const lockedSeats = new Set<number>()
  for (const heroId of lockedHeroIds) {
    const seat = heroes.find((hero) => hero.heroId === heroId)?.seat
    if (typeof seat === 'number') {
      lockedSeats.add(seat)
    }
  }
  const initialCandidate: BeamCandidate = {
    placements: { ...lockedPlacements },
    usedHeroes: new Set(lockedHeroIds),
    usedSeats: lockedSeats,
  }
  let candidates: BeamCandidate[] = [initialCandidate]
  // scored 持有最近一轮评分结果；循环结束即最终候选的评分，收口直接复用，
  // 不再对最后一轮已评分的候选重复跑 scoreFormation（每次全阵型 O(N²×signals)）。
  let scored: Array<{ candidate: BeamCandidate; result: ScoringResult }> = [
    { candidate: initialCandidate, result: scoreFormation(initialCandidate.placements) },
  ]

  for (const slot of slots) {
    const nextCandidates = expandCandidates(candidates, heroes, slot)

    // Score and prune to beam width
    scored = nextCandidates
      .map((c) => ({
        candidate: c,
        result: scoreFormation(c.placements),
      }))
      .sort((a, b) => compareGameNumbers(b.result.objectiveValue, a.result.objectiveValue))
      .slice(0, beamWidth)

    candidates = scored.map((s) => s.candidate)
  }

  return scored
    .map((s) => ({
      objectiveValue: s.result.objectiveValue,
      placements: s.candidate.placements,
      warnings: s.result.warnings,
      carryHeroId: s.result.carryHeroId,
      activeSignalKinds: s.result.activeSignalKinds,
      areaEstimate: s.result.areaEstimate ?? null,
      breakdown: s.result.breakdown ?? null,
    }))
    .sort((a, b) => compareGameNumbers(b.objectiveValue, a.objectiveValue))
}
