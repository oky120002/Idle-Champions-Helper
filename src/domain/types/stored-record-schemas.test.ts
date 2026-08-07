import { describe, expect, it } from 'vitest'

import { formationPresetSchema, parseStoredRecord } from './stored-record-schemas'

const validBase = {
  id: 'preset-a',
  name: '方案',
  layoutId: 'layout-a',
  placements: { 'slot-1': 'bruenor' },
  priority: 'medium',
  updatedAt: '2026-08-07T00:00:00.000Z',
} as const

describe('formationPresetSchema filterSnapshot 兼容', () => {
  it('旧记录（无 filterSnapshot）解析通过——passthrough 不要求该字段', () => {
    const result = formationPresetSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('filterSnapshot: null 解析通过', () => {
    const result = formationPresetSchema.safeParse({ ...validBase, filterSnapshot: null })
    expect(result.success).toBe(true)
  })

  it('filterSnapshot 完整对象解析通过且透传', () => {
    const snapshot = {
      search: 'bru',
      selectedSeats: [1, 2],
      selectedRoles: ['speed'],
      selectedAffiliations: ['aff-1'],
      selectedRaces: ['dwarf'],
      selectedGenders: ['male'],
      selectedAlignments: ['lawful-good'],
      selectedProfessions: ['fighter'],
      selectedAcquisitions: ['core'],
      selectedMechanics: ['mechanic-1'],
      selectedPatrons: ['patron-1'],
    }
    const result = formationPresetSchema.safeParse({ ...validBase, filterSnapshot: snapshot })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.filterSnapshot).toEqual(snapshot)
    }
  })

  it('filterSnapshot 缺核心字段时拒绝', () => {
    const result = formationPresetSchema.safeParse({
      ...validBase,
      filterSnapshot: { search: 'bru' },
    })
    expect(result.success).toBe(false)
  })
})

describe('parseStoredRecord formation preset', () => {
  it('旧记录（无 filterSnapshot）解析后 cast 不 throw', () => {
    expect(() => parseStoredRecord([validBase], formationPresetSchema.array(), 'test')).not.toThrow()
  })
})
