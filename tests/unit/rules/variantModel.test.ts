import { describe, expect, it } from 'vitest'
import type { FormationLayout, LocalizedOption, LocalizedText, Variant } from '../../../src/domain/types'
import { groupVariantsByCampaign } from '../../../src/pages/variants/variant-grouping'
import {
  filterVariants,
  getAttackProfileId,
  getSpecialEnemyRangeId,
} from '../../../src/pages/variants/variant-model'

function localized(original: string, display = original): LocalizedText {
  return { original, display }
}

function option(id: string, original: string, display = original): LocalizedOption {
  return { id, original, display }
}

function createVariant(
  id: string,
  overrides: Partial<Variant> & Pick<Variant, 'campaign' | 'name'>,
): Variant {
  return {
    id,
    campaign: overrides.campaign,
    name: overrides.name,
    adventureId: overrides.adventureId ?? null,
    adventure: overrides.adventure ?? null,
    objectiveArea: overrides.objectiveArea ?? null,
    locationId: overrides.locationId ?? null,
    areaSetId: overrides.areaSetId ?? null,
    scene: overrides.scene ?? null,
    restrictions: overrides.restrictions ?? [],
    rewards: overrides.rewards ?? [],
    enemyCount: overrides.enemyCount ?? 0,
    enemyTypes: overrides.enemyTypes ?? [],
    attackMix: overrides.attackMix ?? { melee: 0, ranged: 0, magic: 0, other: 0 },
    specialEnemyCount: overrides.specialEnemyCount ?? 0,
    escortCount: overrides.escortCount ?? 0,
    areaHighlights: overrides.areaHighlights ?? [],
    areaMilestones: overrides.areaMilestones ?? [],
    mechanics: overrides.mechanics ?? [],
  }
}

function createFormation(id: string, contexts: FormationLayout['sourceContexts']): FormationLayout {
  const formation: FormationLayout = {
    id,
    name: localized(id),
    slots: [
      { id: `${id}-1`, row: 1, column: 1 },
      { id: `${id}-2`, row: 2, column: 2 },
      { id: `${id}-3`, row: 3, column: 3 },
    ],
  }

  if (contexts) {
    formation.sourceContexts = contexts
  }

  return formation
}

const campaignOne = option('1', 'Grand Tour', '大冒险')
const campaignTwo = option('2', 'Icewind Dale', '冰风谷')
const sceneFarm = option('1:1', 'Cursed Farm', '诅咒农场')
const sceneCatacombs = option('1:2', 'Moon Catacombs', '月下墓穴')

describe('variant helpers', () => {
  it('按敌方攻击构成映射攻击占比筛选桶', () => {
    expect(getAttackProfileId({ attackMix: { melee: 8, ranged: 1, magic: 1, other: 0 } })).toBe(
      'meleeHeavy',
    )
    expect(getAttackProfileId({ attackMix: { melee: 2, ranged: 3, magic: 0, other: 0 } })).toBe(
      'rangedThreat',
    )
    expect(getAttackProfileId({ attackMix: { melee: 0, ranged: 0, magic: 0, other: 0 } })).toBe(
      'mixed',
    )
  })

  it('按特别敌人数量划分轻量、标准和密集区间', () => {
    expect(getSpecialEnemyRangeId(9)).toBe('light')
    expect(getSpecialEnemyRangeId(10)).toBe('standard')
    expect(getSpecialEnemyRangeId(12)).toBe('standard')
    expect(getSpecialEnemyRangeId(13)).toBe('dense')
  })
})

describe('filterVariants', () => {
  const variants: Variant[] = [
    createVariant('1', {
      campaign: campaignOne,
      name: localized('Beast Ambush', '野兽伏击'),
      adventureId: '100',
      adventure: localized('Farm Road', '农场小径'),
      objectiveArea: 75,
      scene: sceneFarm,
      restrictions: [localized('Only beasts allowed', '只能对付野兽')],
      enemyTypes: ['beast'],
      attackMix: { melee: 8, ranged: 1, magic: 0, other: 0 },
      specialEnemyCount: 8,
      areaMilestones: [75],
    }),
    createVariant('2', {
      campaign: campaignOne,
      name: localized('Archer Barrage', '箭雨压制'),
      adventureId: '101',
      adventure: localized('Catacombs', '墓穴'),
      objectiveArea: 125,
      scene: sceneCatacombs,
      restrictions: [localized('Avoid the archer packs', '注意远程弓兵怪群')],
      enemyTypes: ['undead'],
      attackMix: { melee: 1, ranged: 4, magic: 0, other: 0 },
      specialEnemyCount: 11,
      areaMilestones: [50, 125],
    }),
    createVariant('3', {
      campaign: campaignTwo,
      name: localized('Dragon Siege', '巨龙围城'),
      adventureId: '200',
      adventure: localized('Frozen Gate', '冰封关口'),
      objectiveArea: 175,
      scene: sceneFarm,
      restrictions: [localized('Dragons only', '只有龙类敌人')],
      enemyTypes: ['dragon'],
      attackMix: { melee: 1, ranged: 1, magic: 3, other: 0 },
      specialEnemyCount: 15,
      areaMilestones: [175],
    }),
  ]

  it('组合关键词、战役、场景、敌人类型、攻击占比、特别敌人和区域筛选', () => {
    const filtered = filterVariants({
      variants,
      locale: 'en-US',
      search: 'archer',
      selectedCampaign: campaignOne.id,
      selectedEnemyTypeIds: ['undead', 'dragon'],
      selectedSceneIds: [sceneCatacombs.id],
      selectedAttackProfile: 'rangedThreat',
      selectedSpecialEnemyRange: 'standard',
      areaSearch: '100',
    })

    expect(filtered.map((variant) => variant.id)).toEqual(['2'])
  })
})

describe('groupVariantsByCampaign', () => {
  it('按战役 -> 冒险聚合，并合并敌人、区域、特别敌人与阵型信息', () => {
    const variants: Variant[] = [
      createVariant('11', {
        campaign: campaignOne,
        name: localized('Late Push', '后段推进'),
        adventureId: '300',
        adventure: localized('Twilit Pass', '薄暮山道'),
        objectiveArea: 100,
        scene: sceneFarm,
        enemyTypes: ['fiend'],
        attackMix: { melee: 1, ranged: 3, magic: 0, other: 0 },
        specialEnemyCount: 12,
        areaMilestones: [50, 100],
      }),
      createVariant('10', {
        campaign: campaignOne,
        name: localized('Early Push', '前段推进'),
        adventureId: '300',
        adventure: localized('Twilit Pass', '薄暮山道'),
        objectiveArea: 75,
        scene: sceneFarm,
        enemyTypes: ['beast', 'humanoid'],
        attackMix: { melee: 2, ranged: 1, magic: 0, other: 0 },
        specialEnemyCount: 9,
        areaMilestones: [1, 75],
      }),
      createVariant('20', {
        campaign: campaignTwo,
        name: localized('Frozen Trial', '寒地试炼'),
        adventureId: '400',
        adventure: localized('Frozen Trail', '冰封小径'),
        objectiveArea: 125,
        scene: sceneCatacombs,
        enemyTypes: ['undead'],
        attackMix: { melee: 0, ranged: 2, magic: 0, other: 0 },
        specialEnemyCount: 6,
        areaMilestones: [125],
      }),
    ]
    const formations: FormationLayout[] = [
      createFormation('variant-10-layout', [
        {
          kind: 'variant',
          id: '10',
          name: localized('Early Push'),
        },
      ]),
      createFormation('adventure-300-layout', [
        {
          kind: 'adventure',
          id: '300',
          name: localized('Twilit Pass'),
        },
      ]),
    ]

    const groups = groupVariantsByCampaign({ variants, formations })
    const firstCampaign = groups[0]

    expect(firstCampaign?.variantCount).toBe(2)
    expect(firstCampaign?.adventures).toHaveLength(1)
    expect(firstCampaign?.adventures[0]).toMatchObject({
      adventureId: '300',
      objectiveAreas: [75, 100],
      enemyTypes: ['beast', 'fiend', 'humanoid'],
      attackMix: { melee: 3, ranged: 4, magic: 0, other: 0 },
      specialEnemyMin: 9,
      specialEnemyMax: 12,
      areaMilestones: [1, 50, 75, 100],
    })
    expect(firstCampaign?.adventures[0]?.formation?.id).toBe('adventure-300-layout')
    expect(firstCampaign?.adventures[0]?.variants.map((variant) => variant.id)).toEqual(['10', '11'])
  })
})
