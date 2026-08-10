import { describe, expect, it } from 'vitest'
import { Decimal } from 'decimal.js'
import { unwrap } from '../../../tests/utils/dom-assertions'
import { compareGameNumbers } from '../gameNumber'
import type { HeroAbilityKind } from '../abilities/abilityModel'
import { beamSearch } from './beamSearchRanking'
import type { ScoringResult } from './steadyStateScoring'

function makeResult(score: number, carryHeroId: string | null = null): ScoringResult {
  const value = new Decimal(score)
  return {
    objectiveValue: value,
    warnings: [],
    activeSignalKinds: new Set<HeroAbilityKind>(),
    breakdown: null,
    carryHeroId,
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
    const top = unwrap(results[0], 'expected at least one result')
    // 4 英雄唯一 seat × 4 槽 → 全放置；score = 1×2(bruenor)×1×3(jarlaxle) = 6.0
    expect(top.objectiveValue.toNumber()).toBe(6.0)
    const placedHeroes = Object.values(top.placements)
    expect(placedHeroes).toHaveLength(4)
    expect(placedHeroes).toContain('bruenor')
    expect(placedHeroes).toContain('jarlaxle')
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

  it('top results 包含 score、placements、breakdown 和 warnings', () => {
    const value = new Decimal(5)
    const results = beamSearch({
      heroes,
      slots,
      beamWidth: 2,
      scoreFormation: () => ({
        objectiveValue: value,
        warnings: ['test warning'],
        carryHeroId: 'jarlaxle',
        activeSignalKinds: new Set<HeroAbilityKind>(),
        breakdown: null,
      }),
    })

    const top = unwrap(results[0], 'expected at least one result')
    expect(top.objectiveValue.toNumber()).toBe(5)
    expect(top.warnings).toEqual(['test warning'])
    expect(top.carryHeroId).toBe('jarlaxle')
    expect(top.breakdown).toBeNull()
    expect(Object.keys(top.placements)).toHaveLength(slots.length)
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
      const prev = unwrap(results[i - 1], `expected result at index ${String(i - 1)}`)
      const curr = unwrap(results[i], `expected result at index ${String(i)}`)
      expect(compareGameNumbers(prev.objectiveValue, curr.objectiveValue)).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('beam search lockedPlacements', () => {
  const heroes = [
    { heroId: 'bruenor', seat: 1 },
    { heroId: 'celeste', seat: 2 },
    { heroId: 'nayeli', seat: 3 },
    { heroId: 'jarlaxle', seat: 4 },
  ]

  it('锁定槽位出现在所有结果的相同位置', () => {
    const results = beamSearch({
      heroes,
      slots: ['s2', 's3'],
      beamWidth: 4,
      lockedPlacements: { s1: 'bruenor' },
      scoreFormation: (placements) => makeResult(Object.keys(placements).length),
    })
    expect(results.length).toBeGreaterThan(0)
    for (const result of results) {
      expect(result.placements.s1).toBe('bruenor')
    }
  })

  it('锁定英雄的 seat 被预留（不同 seat 英雄才可入阵）', () => {
    // bruenor(seat 1) 锁在 s1 → 另一个 seat 1 英雄不可入阵（seat 冲突在初始 candidate 预占）
    const heroesWithSeatConflict = [
      { heroId: 'bruenor', seat: 1 },
      { heroId: 'bruenor-alt', seat: 1 },
      { heroId: 'celeste', seat: 2 },
    ]
    const results = beamSearch({
      heroes: heroesWithSeatConflict,
      slots: ['s2'],
      beamWidth: 8,
      lockedPlacements: { s1: 'bruenor' },
      scoreFormation: (placements) => makeResult(Object.keys(placements).length),
    })
    for (const result of results) {
      const placedHeroes = Object.values(result.placements)
      // bruenor-alt(seat 1) 不应出现——seat 1 已被锁定的 bruenor 预占
      expect(placedHeroes).not.toContain('bruenor-alt')
    }
  })

  it('锁定英雄不可重复放置在其他槽位', () => {
    const results = beamSearch({
      heroes,
      slots: ['s2', 's3', 's4'],
      beamWidth: 4,
      lockedPlacements: { s1: 'bruenor' },
      scoreFormation: (placements) => makeResult(Object.keys(placements).length),
    })
    for (const result of results) {
      const placedHeroes = Object.values(result.placements)
      // bruenor 只出现一次（锁定的 s1），不在其他槽位重复
      expect(placedHeroes.filter((id) => id === 'bruenor')).toHaveLength(1)
    }
  })
})
