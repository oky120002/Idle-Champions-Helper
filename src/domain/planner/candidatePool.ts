import type { OwnedHero } from '../user-profile/types'

export interface CandidateEntry {
  heroId: string
  isHypothetical: boolean
  ownedData: OwnedHero | null
  assumptions?: { level: number; equipment: Record<string, number> }
}

export type CandidateMode = 'owned-only' | 'all-hypothetical'

export interface CandidatePoolInput {
  mode: CandidateMode
  ownedHeroes: OwnedHero[]
  allChampionIds: string[]
}

export interface CandidatePoolResult {
  candidates: CandidateEntry[]
}

export function buildCandidatePool(input: CandidatePoolInput): CandidatePoolResult {
  const { mode, ownedHeroes, allChampionIds } = input
  const ownedMap = new Map(ownedHeroes.map((h) => [h.heroId, h]))

  if (mode === 'owned-only') {
    return {
      candidates: ownedHeroes.map((h) => ({
        heroId: h.heroId,
        isHypothetical: false,
        ownedData: h,
      })),
    }
  }

  // all-hypothetical：所有英雄候选，未拥有走 default 假设（level 1 / 无装备）。
  return {
    candidates: allChampionIds.map((id) => {
      const owned = ownedMap.get(id)
      if (owned) {
        return { heroId: id, isHypothetical: false, ownedData: owned }
      }
      return {
        heroId: id,
        isHypothetical: true,
        ownedData: null,
        assumptions: { level: 1, equipment: {} },
      }
    }),
  }
}
