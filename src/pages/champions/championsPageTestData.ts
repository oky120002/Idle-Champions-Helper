import type {
  Champion,
  ChampionEquipmentIcon,
  ChampionIllustration,
  ChampionVisual,
  DataCollection,
  LocalizedText,
} from '../../domain/types'

export interface StringEnumGroup {
  id: string
  values: string[]
}

export interface LocalizedEnumGroup {
  id: string
  values: LocalizedText[]
}

export function localized(original: string, display: string): LocalizedText {
  return { original, display }
}

export const hall = localized('Companions of the Hall', '大厅伙伴团')
export const adversaries = localized('Absolute Adversaries', '绝对宿敌')
export const oxventurers = localized('Oxventurers Guild', '牛冒险者公会')
export const emptyPatronEligibility = {
  eligiblePatronIds: [],
  ruleQualifiedPatronIds: [],
  forcedEligiblePatronIds: [],
  unsupportedPatronIds: [],
}

export const championsFixture: DataCollection<Champion> = {
  updatedAt: '2026-04-13',
  items: [
    {
      id: 'alpha',
      name: localized('Alpha', '阿尔法'),
      seat: 1,
      roles: ['support'],
      affiliations: [hall],
      tags: ['support', 'human', 'male', 'good', 'lawful', 'warlock', 'event', 'y2', 'control_slow', 'starter'],
      patronEligibility: emptyPatronEligibility,
    },
    {
      id: 'beta',
      name: localized('Beta', '贝塔'),
      seat: 2,
      roles: ['healing'],
      affiliations: [hall],
      tags: ['healing', 'elf', 'female', 'good', 'cleric', 'event', 'spec_gold'],
      patronEligibility: emptyPatronEligibility,
    },
    {
      id: 'gamma',
      name: localized('Gamma', '伽马'),
      seat: 2,
      roles: ['dps'],
      affiliations: [adversaries],
      tags: ['dps', 'drow', 'male', 'evil', 'rogue', 'event', 'control_stun'],
      patronEligibility: emptyPatronEligibility,
    },
    {
      id: 'delta',
      name: localized('Delta', '德尔塔'),
      seat: 3,
      roles: ['tank'],
      affiliations: [oxventurers],
      tags: ['tank', 'human', 'female', 'lawful', 'fighter', 'core', 'positional'],
      patronEligibility: emptyPatronEligibility,
    },
  ],
}

export const enumsFixture: DataCollection<StringEnumGroup | LocalizedEnumGroup> = {
  updatedAt: '2026-04-13',
  items: [
    {
      id: 'roles',
      values: ['support', 'healing', 'dps', 'tank'],
    },
    {
      id: 'affiliations',
      values: [hall, adversaries, oxventurers],
    },
  ],
}

const generatedRoleGroups = [['support'], ['healing'], ['dps'], ['tank']] as const
const generatedAffiliationGroups = [[hall], [adversaries], [oxventurers]] as const

export const manyChampionsFixture: DataCollection<Champion> = {
  updatedAt: '2026-04-13',
  items: Array.from({ length: 60 }, (_, index) => {
    const heroNumber = String(index + 1)
    const roleGroup = generatedRoleGroups[index % generatedRoleGroups.length]
    const affiliationGroup = generatedAffiliationGroups[index % generatedAffiliationGroups.length]
    if (roleGroup === undefined || affiliationGroup === undefined) {
      throw new Error('generated group lookup failed')
    }
    return {
      id: `generated-${heroNumber}`,
      name: localized(`Generated Hero ${heroNumber}`, `测试英雄 ${heroNumber}`),
      seat: (index % 12) + 1,
      roles: [...roleGroup],
      affiliations: [...affiliationGroup],
      tags: [`tag-${heroNumber}`],
      patronEligibility: emptyPatronEligibility,
    }
  }),
}

export type ChampionsPageCollectionOverrides = {
  champions?: DataCollection<Champion>
  enums?: DataCollection<StringEnumGroup | LocalizedEnumGroup>
  championVisuals?: DataCollection<ChampionVisual>
  championIllustrations?: DataCollection<ChampionIllustration>
  championEquipmentIcons?: DataCollection<ChampionEquipmentIcon>
}
