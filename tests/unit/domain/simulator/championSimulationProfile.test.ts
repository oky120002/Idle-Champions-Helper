import { describe, expect, it } from 'vitest'
import { projectChampionSimulationProfile } from '../../../../src/domain/simulator/championSimulationProfile'

describe('champion simulation profile', () => {
  it('投影提取 upgrades、feats、loot、legendary effects 和 raw effect strings', () => {
    const detail = {
      upgrades: [
        {
          id: 'upgrade-1',
          requiredLevel: 50,
          upgradeType: 'specialization',
          effectReference: 'global_dps_multiplier_mult',
          effectDefinition: { id: 'eff-1', snapshots: { original: { value: 2.0 }, display: { value: 2.0 } } },
        },
      ],
      feats: [
        { id: 'feat-1', name: 'Shield Master', effects: [{ type: 'dps_mult', value: '1.5' }] },
      ],
      loot: [
        { id: 'loot-1', name: 'Sword of Doom', slotId: 0, rarity: 'epic', effects: [{ type: 'hero_dps_mult', value: '3.0' }] },
      ],
      legendaryEffects: [
        { id: 'leg-1', slotId: 0, effects: [{ type: 'global_dps_mult', value: '2.5' }] },
      ],
      englishName: 'Bruenor Battlehammer',
    }

    const profile = projectChampionSimulationProfile(detail)

    expect(profile.upgrades).toHaveLength(1)
    expect(profile.feats).toHaveLength(1)
    expect(profile.loot).toHaveLength(1)
    expect(profile.legendaryEffects).toHaveLength(1)
    expect(profile.rawEffectStrings).toContain('global_dps_multiplier_mult')
  })

  it('未知 effects 保存在 unsupportedEffects', () => {
    const detail = {
      upgrades: [],
      feats: [],
      loot: [],
      legendaryEffects: [],
      englishName: 'Unknown Hero',
      unsupportedField: 'should be ignored',
      rawEffects: ['unknown_effect_type_xyz'],
    }

    const profile = projectChampionSimulationProfile(detail)

    expect(profile.unsupportedEffects).toContain('unknown_effect_type_xyz')
  })

  it('投影包含本地化名称用于解释', () => {
    const detail = {
      upgrades: [],
      feats: [],
      loot: [],
      legendaryEffects: [],
      englishName: 'Bruenor Battlehammer',
    }

    const profile = projectChampionSimulationProfile(detail)

    expect(profile.englishName).toBe('Bruenor Battlehammer')
  })
})
