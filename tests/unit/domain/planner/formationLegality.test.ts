import { describe, expect, it } from 'vitest'
import { checkFormationLegality } from '../../../../src/domain/planner/formationLegality'

describe('formation legality checks', () => {
  it('检测 seat conflicts', () => {
    const result = checkFormationLegality({
      placements: { s1: '1', s2: '5' },
      heroSeats: { '1': 1, '5': 1 },
      variantRules: { constraints: [], warnings: [] },
    })

    const seatConflict = result.violations.find((v) => v.kind === 'seatConflict')
    expect(seatConflict).toBeDefined()
    expect(seatConflict!.heroes).toContain('1')
    expect(seatConflict!.heroes).toContain('5')
  })

  it('检测 banned champions', () => {
    const result = checkFormationLegality({
      placements: { s1: '3' },
      heroSeats: { '3': 2 },
      variantRules: {
        constraints: [{ kind: 'banList', heroIds: ['3'] }],
        warnings: [],
      },
    })

    const banViolation = result.violations.find((v) => v.kind === 'bannedChampion')
    expect(banViolation).toBeDefined()
    expect(banViolation!.heroId).toBe('3')
  })

  it('检测缺失的 forced champions', () => {
    const result = checkFormationLegality({
      placements: { s1: '5' },
      heroSeats: { '5': 2 },
      variantRules: {
        constraints: [{ kind: 'forceInclude', heroIds: ['1', '12'] }],
        warnings: [],
      },
    })

    const missingForce = result.violations.find((v) => v.kind === 'missingForced')
    expect(missingForce).toBeDefined()
    expect(missingForce!.heroIds).toContain('1')
    expect(missingForce!.heroIds).toContain('12')
  })

  it('检测 locked 或被占用 slot', () => {
    const result = checkFormationLegality({
      placements: { s1: '1' },
      heroSeats: { '1': 1 },
      variantRules: { constraints: [], warnings: [] },
      lockedSlots: ['s1'],
    })

    const lockedViolation = result.violations.find((v) => v.kind === 'lockedSlot')
    expect(lockedViolation).toBeDefined()
    expect(lockedViolation!.slotId).toBe('s1')
  })

  it('合法阵型不产生违规', () => {
    const result = checkFormationLegality({
      placements: { s1: '1', s2: '5' },
      heroSeats: { '1': 1, '5': 2 },
      variantRules: { constraints: [], warnings: [] },
    })

    expect(result.violations).toEqual([])
    expect(result.legal).toBe(true)
  })
})
