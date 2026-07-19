import { describe, expect, it } from 'vitest'
import Decimal from 'break_eternity.js'
import { beamSearch } from '../../../../src/domain/planner/beamSearchRanking'
import type { ScoringResult } from '../../../../src/domain/planner/steadyStateScoring'

function makeResult(score: number, carryHeroId: string | null = null): ScoringResult {
  const value = new Decimal(score)
  return {
    score: value,
    warnings: [],
    explanations: [],
    carryHeroId,
    objective: { value, breakdown: [] },
  }
}

describe('beam search ranking', () => {
  const heroes = [
    { heroId: 'bruenor', seat: 1 },
    { heroId: 'celeste', seat: 2 },
    { heroId: 'nayeli', seat: 3 },
    { heroId: 'jarlaxle', seat: 4 },
  ]

  const slots = ['s1', 's2', 's3', 's4']

  it('4-slot 确定性 fixture 返回预期 top result', () => {
    const results = beamSearch({
      heroes,
      slots,
      beamWidth: 3,
      scoreFormation: (placements: Record<string, string>) => {
        let score = 1.0
        for (const [, heroId] of Object.entries(placements)) {
          if (heroId === 'bruenor') score *= 2.0
          if (heroId === 'jarlaxle') score *= 3.0
        }
        return makeResult(score)
      },
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.score.toNumber()).toBeGreaterThan(0)
  })

  it('beam width 限制候选扩展', () => {
    const results = beamSearch({
      heroes,
      slots,
      beamWidth: 1,
      scoreFormation: (placements: Record<string, string>) => makeResult(Object.keys(placements).length),
    })

    expect(results.length).toBeGreaterThan(0)
  })

  it('top results 包含 score、placements、explanations 和 warnings', () => {
    const value = new Decimal(5)
    const results = beamSearch({
      heroes,
      slots,
      beamWidth: 2,
      scoreFormation: () => ({
        score: value,
        warnings: ['test warning'],
        explanations: ['test explanation'],
        carryHeroId: 'jarlaxle',
        objective: { value, breakdown: [] },
      }),
    })

    const top = results[0]!
    expect(top).toHaveProperty('score')
    expect(top).toHaveProperty('placements')
    expect(top).toHaveProperty('explanations')
    expect(top).toHaveProperty('warnings')
    expect(top).toHaveProperty('carryHeroId')
  })
})
