import type { OwnedHero } from '../user-profile/types'

export type CandidateMode = 'owned-only' | 'all-hypothetical'

export interface CandidatePoolInput {
  mode: CandidateMode
  ownedHeroes: OwnedHero[]
  allChampionIds: string[]
}

/**
 * 候选 hero id 列表（阶段 15.3）。
 * - owned-only：仅本地已拥有英雄。
 * - all-hypothetical：全部英雄；未拥有者的 level/equipment 基线由 steadyStateScoring 的
 *   DEFAULT_CARRY_LEVEL 与默认装备兜底（= level 1 / 无装备），不在此重复表达。
 */
export function buildCandidatePool(input: CandidatePoolInput): string[] {
  const { mode, ownedHeroes, allChampionIds } = input
  if (mode === 'owned-only') {
    return ownedHeroes.map((hero) => hero.heroId)
  }
  return [...allChampionIds]
}
