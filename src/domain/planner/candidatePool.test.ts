import { describe, expect, it } from 'vitest'
import { buildCandidatePool } from './candidatePool'
import { createOwnedHero } from '../user-profile/fixtures'
import type { OwnedHero } from '../user-profile/types'

describe('candidate pool modes', () => {
  const ownedHeroes: OwnedHero[] = [
    createOwnedHero({ heroId: '1', level: 500, equipment: { '0': 3 }, feats: ['feat-1'] }),
    createOwnedHero({ heroId: '5', level: 300, equipment: { '0': 2 } }),
  ]
  const allChampionIds = ['1', '5', '12', '24']

  it('owned-only 只返回已拥有 hero id', () => {
    expect(buildCandidatePool({ mode: 'owned-only', ownedHeroes, allChampionIds })).toEqual(['1', '5'])
  })

  it('all-hypothetical 返回全部英雄 id（含未拥有）', () => {
    expect(buildCandidatePool({ mode: 'all-hypothetical', ownedHeroes, allChampionIds })).toEqual([
      '1',
      '5',
      '12',
      '24',
    ])
  })
})
