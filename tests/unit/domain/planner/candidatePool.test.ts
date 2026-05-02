import { describe, expect, it } from 'vitest'
import { buildCandidatePool } from '../../../../src/domain/planner/candidatePool'
import type { OwnedHero } from '../../../../src/domain/user-profile/types'

describe('candidate pool modes', () => {
  const ownedHeroes: OwnedHero[] = [
    { heroId: '1', level: 500, equipment: { '0': 3 }, feats: ['feat-1'], legendaryEffects: [] },
    { heroId: '5', level: 300, equipment: { '0': 2 }, feats: [], legendaryEffects: [] },
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

  it('manual override 模式应用显式假设但不改变 profile data', () => {
    const overrides = new Map([
      ['12', { level: 200, equipment: { '0': 2 } }],
    ])

    const pool = buildCandidatePool({
      mode: 'manual-override',
      ownedHeroes,
      allChampionIds: ['1', '5', '12'],
      overrides,
    })

    const hero12 = pool.candidates.find((c: { heroId: string }) => c.heroId === '12')
    expect(hero12).toBeDefined()
    expect(hero12!.assumptions).toBeTruthy()

    // Original ownedHeroes should not be modified
    expect(ownedHeroes).toHaveLength(2)
    expect(ownedHeroes.find((h) => h.heroId === '12')).toBeUndefined()
  })
})
