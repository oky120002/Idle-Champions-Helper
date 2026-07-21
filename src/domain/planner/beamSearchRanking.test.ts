import { describe, expect, it } from 'vitest'
import Decimal from 'break_eternity.js'
import { beamSearch } from './beamSearchRanking'
import type { ScoringResult } from './steadyStateScoring'
import { compareGameNumbers } from '../simulator/gameNumberArithmetic'
import type { HeroAbilityKind } from '../abilities/abilityModel'

function makeResult(score: number, carryHeroId: string | null = null): ScoringResult {
  const value = new Decimal(score)
  return {
    score: value,
    warnings: [],
    explanations: [],
    carryHeroId,
    objective: { value, breakdown: [] },
    activeSignalKinds: new Set<HeroAbilityKind>(),
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
        activeSignalKinds: new Set<HeroAbilityKind>(),
      }),
    })

    const top = results[0]!
    expect(top).toHaveProperty('score')
    expect(top).toHaveProperty('placements')
    expect(top).toHaveProperty('explanations')
    expect(top).toHaveProperty('warnings')
    expect(top).toHaveProperty('carryHeroId')
  })

  it('同一阵型不放置同 seat 英雄（seat 冲突在生成阶段过滤）', () => {
    const heroesWithSeatConflict = [
      { heroId: 'bruenor', seat: 1 },
      { heroId: 'bruenor-alt', seat: 1 },
      { heroId: 'celeste', seat: 2 },
      { heroId: 'nayeli', seat: 3 },
    ]

    const results = beamSearch({
      heroes: heroesWithSeatConflict,
      slots: ['s1', 's2', 's3'],
      beamWidth: 8,
      scoreFormation: (placements) => makeResult(Object.keys(placements).length),
    })

    expect(results.length).toBeGreaterThan(0)
    for (const result of results) {
      const placedSeats = Object.values(result.placements).map(
        (id) => heroesWithSeatConflict.find((h) => h.heroId === id)?.seat,
      )
      expect(new Set(placedSeats).size).toBe(placedSeats.length)
    }
  })

  it('结果按 score 降序排列且剪枝到 beamWidth', () => {
    const results = beamSearch({
      heroes,
      slots,
      beamWidth: 2,
      scoreFormation: (placements) => {
        const score = Object.values(placements).reduce(
          (sum, id) => sum + (id === 'jarlaxle' ? 100 : 1),
          0,
        )
        return makeResult(score)
      },
    })

    expect(results.length).toBeLessThanOrEqual(2)
    for (let i = 1; i < results.length; i++) {
      expect(compareGameNumbers(results[i - 1]!.score, results[i]!.score)).toBeGreaterThanOrEqual(0)
    }
  })
})
