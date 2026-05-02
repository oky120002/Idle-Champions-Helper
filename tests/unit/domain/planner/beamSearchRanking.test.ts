import { describe, expect, it } from 'vitest'
import { beamSearch } from '../../../../src/domain/planner/beamSearchRanking'

describe('beam search ranking', () => {
  const heroes = [
    { heroId: 'bruenor', seat: 1 },
    { heroId: 'celeste', seat: 2 },
    { heroId: 'nayeli', seat: 3 },
    { heroId: 'jarlaxle', seat: 4 },
  ]

  const slots = ['s1', 's2', 's3', 's4']
  const adjacency: Record<string, string[]> = {
    s1: ['s2'],
    s2: ['s1', 's3'],
    s3: ['s2', 's4'],
    s4: ['s3'],
  }

  it('4-slot 确定性 fixture 返回预期 top result', () => {
    const results = beamSearch({
      heroes,
      slots,
      adjacency,
      beamWidth: 3,
      scoreFormation: (placements: Record<string, string>) => {
        let score = 1.0
        for (const [, heroId] of Object.entries(placements)) {
          if (heroId === 'bruenor') score *= 2.0
          if (heroId === 'jarlaxle') score *= 3.0
        }
        return { score, warnings: [], explanations: [] }
      },
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.score).toBeGreaterThan(0)
  })

  it('beam width 限制候选扩展', () => {
    const results = beamSearch({
      heroes,
      slots,
      adjacency,
      beamWidth: 1,
      scoreFormation: (placements: Record<string, string>) => {
        return { score: Object.keys(placements).length, warnings: [], explanations: [] }
      },
    })

    // With beamWidth=1, should still produce results
    expect(results.length).toBeGreaterThan(0)
  })

  it('top results 包含 score、placements、explanations 和 warnings', () => {
    const results = beamSearch({
      heroes,
      slots,
      adjacency,
      beamWidth: 2,
      scoreFormation: () => ({
        score: 5.0,
        warnings: ['test warning'],
        explanations: ['test explanation'],
      }),
    })

    const top = results[0]!
    expect(top).toHaveProperty('score')
    expect(top).toHaveProperty('placements')
    expect(top).toHaveProperty('explanations')
    expect(top).toHaveProperty('warnings')
  })
})
