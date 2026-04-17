import type { Champion, ChampionVisual, DataCollection, LocalizedText } from '../../../src/domain/types'

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
    },
    {
      id: 'beta',
      name: localized('Beta', '贝塔'),
      seat: 2,
      roles: ['healing'],
      affiliations: [hall],
      tags: ['healing', 'elf', 'female', 'good', 'cleric', 'event', 'spec_gold'],
    },
    {
      id: 'gamma',
      name: localized('Gamma', '伽马'),
      seat: 2,
      roles: ['dps'],
      affiliations: [adversaries],
      tags: ['dps', 'drow', 'male', 'evil', 'rogue', 'event', 'control_stun'],
    },
    {
      id: 'delta',
      name: localized('Delta', '德尔塔'),
      seat: 3,
      roles: ['tank'],
      affiliations: [oxventurers],
      tags: ['tank', 'human', 'female', 'lawful', 'fighter', 'core', 'positional'],
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
  items: Array.from({ length: 60 }, (_, index) => ({
    id: `generated-${index + 1}`,
    name: localized(`Generated Hero ${index + 1}`, `测试英雄 ${index + 1}`),
    seat: (index % 12) + 1,
    roles: [...generatedRoleGroups[index % generatedRoleGroups.length]!],
    affiliations: [...generatedAffiliationGroups[index % generatedAffiliationGroups.length]!],
    tags: [`tag-${index + 1}`],
  })),
}

export type ChampionsPageCollectionOverrides = {
  champions?: DataCollection<Champion>
  enums?: DataCollection<StringEnumGroup | LocalizedEnumGroup>
  championVisuals?: DataCollection<ChampionVisual>
}
