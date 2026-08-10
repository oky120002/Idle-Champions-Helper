import { describe, expect, it } from 'vitest'
import { Decimal } from 'decimal.js'
import { unwrap } from '../../../tests/utils/dom-assertions'
import { compareGameNumbers } from '../gameNumber'
import type { HeroAbilityKind } from '../abilities/abilityModel'
import { beamSearch } from './beamSearchRanking'
import { checkFormationLegality } from './formationLegality'
import type { ScoringResult } from './steadyStateScoring'
import type { VariantRuleResult } from './variantConstraints'

// === Fixtures ===

function makeResult(score: number, carryHeroId: string | null = null): ScoringResult {
  return {
    objectiveValue: new Decimal(score),
    warnings: [],
    activeSignalKinds: new Set<HeroAbilityKind>(),
    breakdown: null,
    carryHeroId,
  }
}

const noConstraints: VariantRuleResult = { constraints: [], warnings: [] }

const heroes = [
  { heroId: 'a', seat: 1 },
  { heroId: 'b', seat: 2 },
  { heroId: 'c', seat: 3 },
  { heroId: 'd', seat: 4 },
  { heroId: 'e', seat: 5 },
]

describe('beam search 不变量守护', () => {
  describe('确定性（相同输入多次调用结果恒等）', () => {
    it('相同 beamSearch 输入 → 相同 placements / objectiveValue 排列', () => {
      const input = {
        heroes,
        slots: ['s1', 's2', 's3'],
        beamWidth: 3,
        scoreFormation: (p: Record<string, string>) => {
          let score = 1
          for (const [, id] of Object.entries(p)) {
            if (id === 'a') score *= 2
            if (id === 'c') score *= 3
          }
          return makeResult(score)
        },
      }

      const r1 = beamSearch(input)
      const r2 = beamSearch(input)

      expect(r1.length).toBe(r2.length)
      for (let i = 0; i < r1.length; i++) {
        const a = unwrap(r1[i], `r1[${String(i)}]`)
        const b = unwrap(r2[i], `r2[${String(i)}]`)
        expect(a.placements).toEqual(b.placements)
        expect(compareGameNumbers(a.objectiveValue, b.objectiveValue)).toBe(0)
      }
    })
  })

  describe('产出恒过 checkFormationLegality（seat 唯一）', () => {
    // beamSearch 内部在 expandCandidates 阶段做了 seat 去重，
    // 但该不变量无测试守护——若 seat check 被移除，所有结果会出现同 seat 重复。
    it('所有结果的 placed seats 无冲突', () => {
      const results = beamSearch({
        heroes,
        slots: ['s1', 's2', 's3', 's4'],
        beamWidth: 5,
        scoreFormation: (p) => makeResult(Object.keys(p).length),
      })

      expect(results.length).toBeGreaterThan(0)
      for (const result of results) {
        const heroSeats: Record<string, number> = {}
        for (const h of heroes) {
          heroSeats[h.heroId] = h.seat
        }
        const legality = checkFormationLegality({
          placements: result.placements,
          heroSeats,
          variantRules: noConstraints,
        })
        expect(legality.legal).toBe(true)
        expect(legality.violations).toEqual([])
      }
    })

    it('含 forced 约束时产出恒包含 forced 英雄', () => {
      // beamSearch 不直接消费 variantRules——这个测试验证的是 checkFormationLegality 的配套使用，
      // 以及 lockedPlacements 作为 beamSearch 的 forced 机制。
      const results = beamSearch({
        heroes,
        slots: ['s2', 's3'],
        beamWidth: 3,
        lockedPlacements: { s1: 'a' },
        scoreFormation: (p) => makeResult(Object.keys(p).length),
      })

      for (const result of results) {
        expect(result.placements.s1).toBe('a')
      }
    })
  })

  describe('lockedPlacements 不变量（恒尊重）', () => {
    it('多 locked + 多 free slot → 所有 locked 出现在所有结果的相同位置', () => {
      const results = beamSearch({
        heroes,
        slots: ['s3', 's4'],
        beamWidth: 4,
        lockedPlacements: { s1: 'a', s2: 'b' },
        scoreFormation: (p) => makeResult(Object.keys(p).length),
      })

      expect(results.length).toBeGreaterThan(0)
      for (const result of results) {
        expect(result.placements.s1).toBe('a')
        expect(result.placements.s2).toBe('b')
      }
    })

    it('locked 英雄不在 free slot 中重复出现', () => {
      const results = beamSearch({
        heroes,
        slots: ['s2', 's3', 's4'],
        beamWidth: 5,
        lockedPlacements: { s1: 'a' },
        scoreFormation: (p) => makeResult(Object.keys(p).length),
      })

      for (const result of results) {
        const placed = Object.values(result.placements)
        expect(placed.filter((id) => id === 'a')).toHaveLength(1)
      }
    })
  })
})

describe('beam search 对抗性反例', () => {
  describe('空 / 奇异输入', () => {
    it('0 英雄 → 返回空数组（expandCandidates 无候选），不 crash', () => {
      const results = beamSearch({
        heroes: [],
        slots: ['s1', 's2'],
        beamWidth: 3,
        scoreFormation: () => makeResult(0),
      })
      // 初始 candidate 在首次 slot 循环中被空 expandCandidates 结果替换 → 返回 []
      expect(results).toEqual([])
    })

    it('0 slot → 返回初始 candidate（无扩展）', () => {
      const results = beamSearch({
        heroes: [{ heroId: 'a', seat: 1 }],
        slots: [],
        beamWidth: 3,
        scoreFormation: () => makeResult(42),
      })
      // 无 slot 循环 → scored 保持初始 candidate → 返回 [{objectiveValue:42, placements:{}}]
      expect(results.length).toBe(1)
      expect(unwrap(results[0], 'expected result').placements).toEqual({})
    })

    it('beamWidth=0 → 不产出候选（全剪枝）', () => {
      const results = beamSearch({
        heroes: [{ heroId: 'a', seat: 1 }],
        slots: ['s1'],
        beamWidth: 0,
        scoreFormation: () => makeResult(1),
      })
      // beamWidth=0 → slice(0,0) 剪枝 → scored=[] → 返回 []
      expect(results).toEqual([])
    })
  })

  describe('极端规模', () => {
    it('同 seat 大量英雄 → seat 冲突在生成阶段过滤，结果无冲突', () => {
      const sameSeatHeroes = Array.from({ length: 10 }, (_, i) => ({
        heroId: `h${String(i)}`, seat: 1,
      }))
      const results = beamSearch({
        heroes: sameSeatHeroes,
        slots: ['s1', 's2', 's3'],
        beamWidth: 5,
        scoreFormation: (p) => makeResult(Object.keys(p).length),
      })

      for (const result of results) {
        const placed = Object.values(result.placements)
        // 所有 placed 英雄 seat=1 → 如果同 slot 有多个则冲突；
        // beamSearch expandCandidates 的 usedSeats check 阻止同 seat 入同一 candidate
        const uniqueSeats = new Set(placed.map((id) => sameSeatHeroes.find((h) => h.heroId === id)?.seat))
        expect(uniqueSeats.size).toBe(placed.length)
      }
    })
  })

  describe('lockedPlacements 边界', () => {
    it('locked 英雄不在 hero 列表中 → seat 不被预留（理论边界）', () => {
      // lockedPlacements 的 heroId 不在 heroes 数组中 → lockedSeats 查不到 seat → 不预留
      const results = beamSearch({
        heroes: [{ heroId: 'a', seat: 1 }, { heroId: 'b', seat: 1 }],
        slots: ['s2'],
        beamWidth: 4,
        lockedPlacements: { s1: 'ghost' },
        scoreFormation: (p) => makeResult(Object.keys(p).length),
      })

      for (const result of results) {
        // 'ghost' 预占 s1，但不在 heroes → seat 不被预留 → a 和 b（同 seat=1）仍可入 s2
        expect(result.placements.s1).toBe('ghost')
      }
    })

    it('locked 占据所有 slot → 搜索无空间扩展', () => {
      // 所有 slot 都被 locked → slots 循环仍跑但 expandCandidates 时 usedHeroes 已含 locked
      // → 只有非 locked 英雄入候选（若有 free slot 可填）
      const results = beamSearch({
        heroes,
        slots: [], // 不留 free slot
        beamWidth: 3,
        lockedPlacements: { s1: 'a', s2: 'b', s3: 'c' },
        scoreFormation: (p) => makeResult(Object.keys(p).length),
      })

      expect(results.length).toBe(1) // 初始 candidate
      expect(unwrap(results[0], 'expected result').placements).toEqual({ s1: 'a', s2: 'b', s3: 'c' })
    })
  })

  describe('结果排序不变量', () => {
    it('结果恒按 objectiveValue 降序排列', () => {
      const results = beamSearch({
        heroes,
        slots: ['s1', 's2', 's3'],
        beamWidth: 5,
        scoreFormation: (p) => {
          const score = Object.values(p).reduce((s, id) => s + (id === 'c' ? 100 : 1), 0)
          return makeResult(score)
        },
      })

      for (let i = 1; i < results.length; i++) {
        const prev = unwrap(results[i - 1], `result ${String(i - 1)}`)
        const curr = unwrap(results[i], `result ${String(i)}`)
        expect(compareGameNumbers(prev.objectiveValue, curr.objectiveValue)).toBeGreaterThanOrEqual(0)
      }
    })
  })
})
