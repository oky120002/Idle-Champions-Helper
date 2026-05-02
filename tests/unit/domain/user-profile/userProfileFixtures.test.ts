import { describe, expect, it } from 'vitest'
import type { OwnedHero, ImportedFormationSave, UserProfileSnapshot } from '../../../../src/domain/user-profile/types'
import {
  createOwnedHero,
  createImportedFormationSave,
  createUserProfileSnapshot,
} from '../../../../src/domain/user-profile/fixtures'

describe('user profile fixtures', () => {
  it('最小已拥有英雄 fixture 通过类型检查', () => {
    const hero: OwnedHero = createOwnedHero()

    expect(hero.heroId).toBe('1')
    expect(hero.level).toBe(1)
    expect(hero.equipment).toEqual({})
    expect(hero.feats).toEqual([])
    expect(hero.legendaryEffects).toEqual([])
  })

  it('导入阵型保存 fixture 包含专精、feat、familiar 和场景引用', () => {
    const save: ImportedFormationSave = createImportedFormationSave({
      formationId: 'fm-100',
      layoutId: 'layout-grand-hero',
      scenarioRef: { kind: 'variant', id: '42' },
      placements: { s1: '1', s2: '5', s3: '12' },
      specializations: { '1': 'buff-spec-a' },
      feats: { '1': ['feat-shield'], '5': ['feat-dps'] },
      familiars: { s1: 'familiar-1' },
      isFavorite: true,
    })

    expect(save.formationId).toBe('fm-100')
    expect(save.scenarioRef.kind).toBe('variant')
    expect(save.specializations['1']).toBe('buff-spec-a')
    expect(save.feats['5']).toEqual(['feat-dps'])
    expect(save.familiars.s1).toBe('familiar-1')
    expect(save.isFavorite).toBe(true)
  })

  it('可选字段缺失时 builder 仍能生成 snapshot 并带 warning', () => {
    const snapshot: UserProfileSnapshot = createUserProfileSnapshot(
      { ownedHeroes: [createOwnedHero({ heroId: '42' })] },
      ['importedFormationSaves was empty — user has no saved formations'],
    )

    expect(snapshot.schemaVersion).toBe(1)
    expect(snapshot.ownedHeroes).toHaveLength(1)
    expect(snapshot.ownedHeroes[0]?.heroId).toBe('42')
    expect(snapshot.importedFormationSaves).toEqual([])
    expect(snapshot.warnings).toHaveLength(1)
    expect(snapshot.updatedAt).toBeTruthy()
  })
})
