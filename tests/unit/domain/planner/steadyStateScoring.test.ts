import { describe, expect, it } from 'vitest'
import { scoreFormation } from '../../../../src/domain/planner/steadyStateScoring'

describe('steady state scoring', () => {
  it('类似 Bruenor 的 adjacent support 放在相邻位置时评分更高', () => {
    const adjacentSupportScore = scoreFormation({
      placements: { s1: 'bruenor', s2: 'dps-hero' },
      effects: [
        { heroId: 'bruenor', kind: 'adjacentBuff', value: 2.0, targetSlots: ['s2'] },
        { heroId: 'dps-hero', kind: 'globalDpsMultiplier', value: 1.0 },
      ],
      adjacency: { s1: ['s2'], s2: ['s1'] },
    })

    const nonAdjacentScore = scoreFormation({
      placements: { s1: 'bruenor', s3: 'dps-hero' },
      effects: [
        { heroId: 'bruenor', kind: 'adjacentBuff', value: 2.0, targetSlots: ['s3'] },
        { heroId: 'dps-hero', kind: 'globalDpsMultiplier', value: 1.0 },
      ],
      adjacency: { s1: ['s2'], s2: ['s1'], s3: [] },
    })

    expect(adjacentSupportScore.score).toBeGreaterThan(nonAdjacentScore.score)
  })

  it('global DPS support 不受 adjacency 影响', () => {
    const nearScore = scoreFormation({
      placements: { s1: 'global-buffer', s2: 'dps-hero' },
      effects: [
        { heroId: 'global-buffer', kind: 'globalDpsMultiplier', value: 3.0 },
      ],
      adjacency: { s1: ['s2'], s2: ['s1'] },
    })

    const farScore = scoreFormation({
      placements: { s1: 'global-buffer', s3: 'dps-hero' },
      effects: [
        { heroId: 'global-buffer', kind: 'globalDpsMultiplier', value: 3.0 },
      ],
      adjacency: { s1: ['s2'], s2: ['s1'], s3: [] },
    })

    expect(nearScore.score).toBe(farScore.score)
  })

  it('unsupported effects 出现在 result warnings 中', () => {
    const result = scoreFormation({
      placements: { s1: 'hero-1' },
      effects: [
        { heroId: 'hero-1', kind: 'unsupported' as const, rawEffect: 'mystery_effect', note: 'unknown' },
      ],
      adjacency: { s1: [] },
    })

    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('mystery_effect')
  })
})
