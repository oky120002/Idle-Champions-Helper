import { describe, expect, it } from 'vitest'
import { unwrap } from '../../../tests/utils/dom-assertions'
import { checkFormationLegality } from './formationLegality'
import type { VariantRuleResult } from './variantConstraints'

// === 组合决策表（Decision Table） ===
// 系统化覆盖 seat 冲突 × forced 缺失的多约束组合与交互效应。
// 每行是决策表的一个等价类组合，断言合法/非法 + 违规种类与数量。

const noConstraints: VariantRuleResult = { constraints: [], warnings: [] }
const forceAB = { kind: 'forceInclude' as const, heroIds: ['a', 'b'] }
const forceC = { kind: 'forceInclude' as const, heroIds: ['c'] }

interface DecisionRow {
  name: string
  placements: Record<string, string>
  heroSeats: Record<string, number>
  variantRules: VariantRuleResult
  expectedLegal: boolean
  expectedViolationKinds: string[]
}

const decisionTable: DecisionRow[] = [
  // --- 单约束：合法 ---
  {
    name: '不同 seat 无 forced → 合法',
    placements: { s1: 'a', s2: 'b' },
    heroSeats: { a: 1, b: 2 },
    variantRules: noConstraints,
    expectedLegal: true,
    expectedViolationKinds: [],
  },
  {
    name: '单英雄无 forced → 合法',
    placements: { s1: 'a' },
    heroSeats: { a: 1 },
    variantRules: noConstraints,
    expectedLegal: true,
    expectedViolationKinds: [],
  },
  {
    name: '空 placements 无 forced → 合法',
    placements: {},
    heroSeats: {},
    variantRules: noConstraints,
    expectedLegal: true,
    expectedViolationKinds: [],
  },

  // --- 单约束：seat 冲突 ---
  {
    name: '两英雄同 seat → seat 冲突',
    placements: { s1: 'a', s2: 'b' },
    heroSeats: { a: 1, b: 1 },
    variantRules: noConstraints,
    expectedLegal: false,
    expectedViolationKinds: ['seatConflict'],
  },
  {
    name: '三英雄同 seat → 单条 seatConflict 含三英雄',
    placements: { s1: 'a', s2: 'b', s3: 'c' },
    heroSeats: { a: 1, b: 1, c: 1 },
    variantRules: noConstraints,
    expectedLegal: false,
    expectedViolationKinds: ['seatConflict'],
  },
  {
    name: '两组 seat 冲突（不同 seat 号）→ 两条 seatConflict',
    placements: { s1: 'a', s2: 'b', s3: 'c', s4: 'd' },
    heroSeats: { a: 1, b: 1, c: 2, d: 2 },
    variantRules: noConstraints,
    expectedLegal: false,
    expectedViolationKinds: ['seatConflict', 'seatConflict'],
  },

  // --- 单约束：forced 缺失 ---
  {
    name: 'forced 全缺失 → missingForced',
    placements: { s1: 'c' },
    heroSeats: { c: 3 },
    variantRules: { constraints: [forceAB], warnings: [] },
    expectedLegal: false,
    expectedViolationKinds: ['missingForced'],
  },
  {
    name: 'forced 部分在位 → missingForced 含缺失项',
    placements: { s1: 'a', s2: 'c' },
    heroSeats: { a: 1, c: 3 },
    variantRules: { constraints: [forceAB], warnings: [] },
    expectedLegal: false,
    expectedViolationKinds: ['missingForced'],
  },
  {
    name: 'forced 全在位 → 合法',
    placements: { s1: 'a', s2: 'b' },
    heroSeats: { a: 1, b: 2 },
    variantRules: { constraints: [forceAB], warnings: [] },
    expectedLegal: true,
    expectedViolationKinds: [],
  },

  // --- 多约束交互：seat 冲突 + forced 缺失 ---
  {
    name: 'seat 冲突 + forced 缺失叠加 → 两条违规',
    placements: { s1: 'a', s2: 'b' },
    heroSeats: { a: 1, b: 1 },
    variantRules: { constraints: [forceC], warnings: [] },
    expectedLegal: false,
    expectedViolationKinds: ['seatConflict', 'missingForced'],
  },
  {
    name: 'seat 冲突但 forced 在位 → 仅 seatConflict',
    placements: { s1: 'a', s2: 'b' },
    heroSeats: { a: 1, b: 1 },
    variantRules: { constraints: [forceAB], warnings: [] },
    expectedLegal: false,
    expectedViolationKinds: ['seatConflict'],
  },

  // --- 边界：英雄不在 heroSeats 中 ---
  {
    name: '英雄不在 heroSeats → 不产生 seat 违规（seat=undefined）',
    placements: { s1: 'unknown' },
    heroSeats: {},
    variantRules: noConstraints,
    expectedLegal: true,
    expectedViolationKinds: [],
  },
  {
    name: 'forced 指向不在 placements 也不在 heroSeats 的英雄',
    placements: { s1: 'a' },
    heroSeats: { a: 1 },
    variantRules: { constraints: [forceC], warnings: [] },
    expectedLegal: false,
    expectedViolationKinds: ['missingForced'],
  },
]

describe('formationLegality 组合决策表', () => {
  it.each(decisionTable)('$name', (row) => {
    const result = checkFormationLegality({
      placements: row.placements,
      heroSeats: row.heroSeats,
      variantRules: row.variantRules,
    })

    expect(result.legal).toBe(row.expectedLegal)

    const actualKinds = result.violations.map((v) => v.kind)
    expect(actualKinds).toEqual(expect.arrayContaining(row.expectedViolationKinds))
    expect(actualKinds.length).toBe(row.expectedViolationKinds.length)
  })

  // 反单调性：合法阵型移除任一英雄后仍合法
  it('约束反单调性：合法阵型移除任一英雄后恒仍合法', () => {
    const baseLegal = {
      placements: { s1: 'a', s2: 'b', s3: 'c' },
      heroSeats: { a: 1, b: 2, c: 3 },
      variantRules: noConstraints,
    }
    expect(checkFormationLegality(baseLegal).legal).toBe(true)

    // 移除每个英雄 → 仍合法（无 seat 冲突不因减少而新增）
    const entries = Object.entries(baseLegal.placements)
    for (let i = 0; i < entries.length; i++) {
      const reduced = Object.fromEntries(entries.filter((_, j) => j !== i))
      const result = checkFormationLegality({
        placements: reduced,
        heroSeats: baseLegal.heroSeats,
        variantRules: baseLegal.variantRules,
      })
      expect(result.legal).toBe(true)
      expect(result.violations).toEqual([])
    }
  })

  // 反单调性例外：forced 约束不满足反单调性（移除 forced 英雄会新增 missingForced 违规）
  it('forced 约束不满足反单调性：移除 forced 英雄后变非法（交互效应）', () => {
    const legal = {
      placements: { s1: 'a', s2: 'b', s3: 'c' },
      heroSeats: { a: 1, b: 2, c: 3 },
      variantRules: { constraints: [forceAB], warnings: [] },
    }
    expect(checkFormationLegality(legal).legal).toBe(true)

    // 移除 forced 英雄 a → 新增 missingForced 违规
    const reduced = { s2: 'b', s3: 'c' }
    const result = checkFormationLegality({
      placements: reduced,
      heroSeats: legal.heroSeats,
      variantRules: legal.variantRules,
    })
    expect(result.legal).toBe(false)
    const missing = result.violations.find((v) => v.kind === 'missingForced')
    expect(missing).toBeDefined()
    // find predicate narrows type → unwrap returns { kind: 'missingForced'; heroIds: string[] }
    const v = unwrap(missing, 'expected missingForced')
    expect(v.heroIds).toContain('a')
  })
})
