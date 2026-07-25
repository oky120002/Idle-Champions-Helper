import { describe, expect, it } from 'vitest'
import { buildCandidatePool } from './candidatePool'
import { createOwnedHero } from '../user-profile/fixtures'
import type { OwnedHero } from '../user-profile/types'

describe('candidate pool modes', () => {
  const ownedHeroes: OwnedHero[] = [
    createOwnedHero({ heroId: '1', level: 500, equipment: { '0': 3 }, feats: ['feat-1'] }),
    createOwnedHero({ heroId: '5', level: 300, equipment: { '0': 2 } }),
  ]

  it('owned-only 模式只返回已拥有 heroes', () => {
    const pool = buildCandidatePool({
      mode: 'owned-only',
      ownedHeroes,
      allChampionIds: ['1', '5', '12', '24'],
    })

    expect(pool.candidates).toHaveLength(2)
    expect(pool.candidates.map((c: { heroId: string }) => c.heroId)).toEqual(['1', '5'])
  })

  it('all-hypothetical 模式包含带假设的未拥有 heroes', () => {
    const pool = buildCandidatePool({
      mode: 'all-hypothetical',
      ownedHeroes,
      allChampionIds: ['1', '5', '12', '24'],
    })

    expect(pool.candidates).toHaveLength(4)
    const unowned = pool.candidates.filter((c: { isHypothetical: boolean }) => c.isHypothetical)
    expect(unowned).toHaveLength(2)
    expect(unowned.map((c: { heroId: string }) => c.heroId).sort()).toEqual(['12', '24'])
  })
})
