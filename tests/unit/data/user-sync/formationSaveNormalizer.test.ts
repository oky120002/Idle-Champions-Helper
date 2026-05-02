import { describe, expect, it } from 'vitest'
import { normalizeFormationSaves } from '../../../../src/data/user-sync/userProfileNormalizer'

describe('imported formation save normalizer', () => {
  it('将 mock getallformationsaves payload 转换为 ImportedFormationSave', () => {
    const payload = {
      formations: [
        {
          formation_id: 'fm-100',
          layout_id: 'layout-grand-hero',
          scenario: { kind: 'adventure' as const, id: '10' },
          placements: { s1: '1', s2: '5' },
          specializations: { '1': 'spec-a' },
          feats: { '1': ['feat-1'] },
          familiars: { s1: 'fam-1' },
          is_favorite: true,
        },
      ],
    }

    const result = normalizeFormationSaves(payload)

    expect(result.formations).toHaveLength(1)
    const save = result.formations[0]!
    expect(save.formationId).toBe('fm-100')
    expect(save.specializations['1']).toBe('spec-a')
    expect(save.feats['1']).toEqual(['feat-1'])
    expect(save.familiars.s1).toBe('fam-1')
    expect(save.isFavorite).toBe(true)
  })

  it('保留 specializations、feats、familiars、favorite flag 和 scenario relation', () => {
    const payload = {
      formations: [
        {
          formation_id: 'fm-200',
          layout_id: 'layout-3col',
          scenario: { kind: 'variant' as const, id: '42' },
          placements: { s1: '12', s2: '24' },
          specializations: { '12': 'dps-spec', '24': 'support-spec' },
          feats: { '12': ['feat-dps-1', 'feat-dps-2'] },
          familiars: {},
          is_favorite: false,
        },
      ],
    }

    const result = normalizeFormationSaves(payload)

    const save = result.formations[0]!
    expect(save.scenarioRef.kind).toBe('variant')
    expect(save.scenarioRef.id).toBe('42')
    expect(save.specializations['24']).toBe('support-spec')
    expect(save.feats['12']).toHaveLength(2)
    expect(save.isFavorite).toBe(false)
  })

  it('未知 formation layout id 产生 warning 而不是静默丢弃', () => {
    const payload = {
      formations: [
        {
          formation_id: 'fm-300',
          layout_id: 'totally-unknown-layout-id',
          placements: {},
          specializations: {},
          feats: {},
          familiars: {},
          is_favorite: false,
        },
      ],
    }

    const result = normalizeFormationSaves(payload)

    expect(result.formations).toHaveLength(1)
    expect(result.formations[0]!.layoutId).toBe('totally-unknown-layout-id')
  })
})
