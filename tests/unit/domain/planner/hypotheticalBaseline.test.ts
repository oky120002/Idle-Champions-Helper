import { describe, expect, it } from 'vitest'
import { computeHypotheticalBaseline } from '../../../../src/domain/planner/hypotheticalBaseline'

describe('hypothetical fairness baseline', () => {
  it('同 seat 中位装备可用时使用它', () => {
    const owned = [
      { heroId: '1', seat: 1, equipment: { '0': 3, '1': 2 } },
      { heroId: '2', seat: 1, equipment: { '0': 5, '1': 4 } },
    ]

    const baseline = computeHypotheticalBaseline({
      targetSeat: 1,
      ownedHeroes: owned,
      targetHeroId: '12',
    })

    // Median of [3,5] = 4 for slot 0; [2,4] = 3 for slot 1
    expect(baseline.equipment['0']).toBe(4)
    expect(baseline.equipment['1']).toBe(3)
    expect(baseline.source).toBe('same-seat-median')
  })

  it('同 seat 数据不可用时使用账号全局中位数', () => {
    const owned = [
      { heroId: '1', seat: 1, equipment: { '0': 3 } },
      { heroId: '5', seat: 2, equipment: { '0': 5 } },
    ]

    const baseline = computeHypotheticalBaseline({
      targetSeat: 3,
      ownedHeroes: owned,
      targetHeroId: '12',
    })

    // No seat-3 heroes, fallback to account-wide median of [3,5] = 4
    expect(baseline.equipment['0']).toBe(4)
    expect(baseline.source).toBe('account-median')
  })

  it('空账号 fallback 明确标记为 no-equipment/no-feat', () => {
    const baseline = computeHypotheticalBaseline({
      targetSeat: 1,
      ownedHeroes: [],
      targetHeroId: '12',
    })

    expect(baseline.source).toBe('no-equipment/no-feat')
    expect(baseline.equipment).toEqual({})
  })
})
