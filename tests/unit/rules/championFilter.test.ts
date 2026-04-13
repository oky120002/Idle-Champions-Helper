import { describe, expect, it } from 'vitest'
import { filterChampions } from '../../../src/rules/championFilter'
import type { Champion, LocalizedText } from '../../../src/domain/types'

function localized(original: string, display: string): LocalizedText {
  return { original, display }
}

function createChampion(
  id: string,
  seat: number,
  roles: string[],
  affiliations: LocalizedText[],
  tags: string[] = [],
): Champion {
  return {
    id,
    name: localized(id, id),
    seat,
    roles,
    affiliations,
    tags,
  }
}

const hall = localized('Companions of the Hall', '大厅伙伴团')
const adversaries = localized('Absolute Adversaries', '绝对宿敌')
const oxventurers = localized('Oxventurers Guild', '牛冒险者公会')

const champions: Champion[] = [
  createChampion('alpha', 1, ['support'], [hall], ['human', 'male', 'good', 'warlock', 'event', 'control_slow']),
  createChampion('beta', 2, ['healing'], [hall], ['elf', 'female', 'good', 'cleric', 'event', 'spec_gold']),
  createChampion('gamma', 2, ['dps'], [adversaries], ['drow', 'male', 'evil', 'rogue', 'event', 'control_stun']),
  createChampion('delta', 3, ['tank'], [oxventurers], ['human', 'female', 'lawful', 'fighter', 'core', 'positional']),
]

describe('filterChampions', () => {
  it('支持座位多选，并在同一维度内按或匹配', () => {
    expect(
      filterChampions(champions, {
        search: '',
        seats: [1, 2],
        roles: [],
        affiliations: [],
        races: [],
        genders: [],
        professions: [],
        alignments: [],
        acquisitions: [],
        mechanics: [],
      }).map((champion) => champion.id),
    ).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('定位和联动队伍支持多选，不同维度之间继续按且组合', () => {
    expect(
      filterChampions(champions, {
        search: '',
        seats: [],
        roles: ['support', 'dps'],
        affiliations: ['Companions of the Hall', 'Absolute Adversaries'],
        races: [],
        genders: [],
        professions: [],
        alignments: [],
        acquisitions: [],
        mechanics: [],
      }).map((champion) => champion.id),
    ).toEqual(['alpha', 'gamma'])
  })

  it('支持按种族、性别和职业多选过滤', () => {
    expect(
      filterChampions(champions, {
        search: '',
        seats: [],
        roles: [],
        affiliations: [],
        races: ['human', 'drow'],
        genders: ['male'],
        professions: ['warlock', 'rogue'],
        alignments: [],
        acquisitions: [],
        mechanics: [],
      }).map((champion) => champion.id),
    ).toEqual(['alpha', 'gamma'])
  })

  it('支持按阵营、获取方式和机制多选过滤', () => {
    expect(
      filterChampions(champions, {
        search: '',
        seats: [],
        roles: [],
        affiliations: [],
        races: [],
        genders: [],
        professions: [],
        alignments: ['good'],
        acquisitions: ['event'],
        mechanics: ['control_slow', 'spec_gold'],
      }).map((champion) => champion.id),
    ).toEqual(['alpha', 'beta'])
  })
})
