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
): Champion {
  return {
    id,
    name: localized(id, id),
    seat,
    roles,
    affiliations,
    tags: [],
  }
}

const hall = localized('Companions of the Hall', '大厅伙伴团')
const adversaries = localized('Absolute Adversaries', '绝对宿敌')
const oxventurers = localized('Oxventurers Guild', '牛冒险者公会')

const champions: Champion[] = [
  createChampion('alpha', 1, ['support'], [hall]),
  createChampion('beta', 2, ['healing'], [hall]),
  createChampion('gamma', 2, ['dps'], [adversaries]),
  createChampion('delta', 3, ['tank'], [oxventurers]),
]

describe('filterChampions', () => {
  it('支持座位多选，并在同一维度内按或匹配', () => {
    expect(
      filterChampions(champions, {
        search: '',
        seats: [1, 2],
        roles: [],
        affiliations: [],
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
      }).map((champion) => champion.id),
    ).toEqual(['alpha', 'gamma'])
  })
})
