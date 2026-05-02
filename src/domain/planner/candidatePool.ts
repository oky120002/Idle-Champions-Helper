import type { OwnedHero } from '../user-profile/types'

export interface CandidateEntry {
  heroId: string
  isHypothetical: boolean
  ownedData: OwnedHero | null
  assumptions?: { level: number; equipment: Record<string, number> }
}

export interface CandidatePoolInput {
  mode: 'owned-only' | 'all-hypothetical' | 'manual-override'
  ownedHeroes: OwnedHero[]
  allChampionIds: string[]
  overrides?: Map<string, { level: number; equipment: Record<string, number> }>
}

export interface CandidatePoolResult {
  candidates: CandidateEntry[]
}

export function buildCandidatePool(input: CandidatePoolInput): CandidatePoolResult {
  const { mode, ownedHeroes, allChampionIds, overrides } = input
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

  if (mode === 'all-hypothetical') {
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

  // manual-override
  return {
    candidates: allChampionIds.map((id) => {
      const owned = ownedMap.get(id)
      if (owned) {
        return { heroId: id, isHypothetical: false, ownedData: owned }
      }

      const override = overrides?.get(id)
      return {
        heroId: id,
        isHypothetical: true,
        ownedData: null,
        assumptions: override ?? { level: 1, equipment: {} },
      }
    }),
  }
}
