import { describe, expect, it } from 'vitest'
import type { Champion, ChampionFilterSnapshot, ChampionPatronEligibility, LocalizedText } from '../domain/types'
import { championFilterSnapshotToFilters, filterChampions, hasActiveChampionFilters } from './championFilter'

function localized(original: string, display: string): LocalizedText {
  return { original, display }
}

function patronEligibility(...eligiblePatronIds: string[]): ChampionPatronEligibility {
  return {
    eligiblePatronIds,
    ruleQualifiedPatronIds: [],
    forcedEligiblePatronIds: [],
    unsupportedPatronIds: [],
  }
}

function createChampion(
  id: string,
  seat: number,
  roles: string[],
  affiliations: LocalizedText[],
  tags: string[] = [],
  patronEligibility?: ChampionPatronEligibility,
): Champion {
  return {
    id,
    name: localized(id, id),
    seat,
    roles,
    affiliations,
    tags,
    ...(patronEligibility ? { patronEligibility } : {}),
  }
}

const hall = localized('Companions of the Hall', '大厅伙伴团')
const adversaries = localized('Absolute Adversaries', '绝对宿敌')
const oxventurers = localized('Oxventurers Guild', '牛冒险者公会')

const champions: Champion[] = [
  createChampion(
    'alpha',
    1,
    ['support'],
    [hall],
    ['human', 'male', 'good', 'warlock', 'event', 'control_slow'],
    patronEligibility('1', '2'),
  ),
  createChampion(
    'beta',
    2,
    ['healing'],
    [hall],
    ['elf', 'female', 'good', 'cleric', 'event', 'spec_gold'],
    patronEligibility('1'),
  ),
  createChampion(
    'gamma',
    2,
    ['dps'],
    [adversaries],
    ['drow', 'male', 'evil', 'rogue', 'event', 'control_stun'],
    patronEligibility('2', '3'),
  ),
  createChampion('delta', 3, ['tank'], [oxventurers], [
    'human',
    'female',
    'lawful',
    'fighter',
    'core',
    'positional',
  ]),
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
        patrons: [],
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
        patrons: [],
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
        patrons: [],
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
        patrons: [],
      }).map((champion) => champion.id),
    ).toEqual(['alpha', 'beta'])
  })

  it('赞助人过滤：命中 eligiblePatronIds 的英雄才显示，多选按或匹配', () => {
    expect(
      filterChampions(champions, {
        search: '',
        seats: [],
        roles: [],
        affiliations: [],
        races: [],
        genders: [],
        professions: [],
        alignments: [],
        acquisitions: [],
        mechanics: [],
        patrons: ['1', '3'],
      }).map((champion) => champion.id),
    ).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('赞助人过滤：无 patronEligibility 或未命中赞助人的英雄不显示', () => {
    expect(
      filterChampions(champions, {
        search: '',
        seats: [],
        roles: [],
        affiliations: [],
        races: [],
        genders: [],
        professions: [],
        alignments: [],
        acquisitions: [],
        mechanics: [],
        patrons: ['5'],
      }).map((champion) => champion.id),
    ).toEqual([])
  })
})

describe('championFilterSnapshotToFilters', () => {
  it('selected* 字段名映射到短字段名，search 直传', () => {
    const snapshot: ChampionFilterSnapshot = {
      search: 'bru',
      selectedSeats: [1],
      selectedRoles: ['support'],
      selectedAffiliations: ['aff-1'],
      selectedRaces: ['dwarf'],
      selectedGenders: ['male'],
      selectedAlignments: ['lawful-good'],
      selectedProfessions: ['fighter'],
      selectedAcquisitions: ['core'],
      selectedMechanics: ['m1'],
      selectedPatrons: ['p1'],
    }
    expect(championFilterSnapshotToFilters(snapshot)).toEqual({
      search: 'bru',
      seats: [1],
      roles: ['support'],
      affiliations: ['aff-1'],
      races: ['dwarf'],
      genders: ['male'],
      alignments: ['lawful-good'],
      professions: ['fighter'],
      acquisitions: ['core'],
      mechanics: ['m1'],
      patrons: ['p1'],
    })
  })
})

describe('hasActiveChampionFilters', () => {
  const empty: ChampionFilterSnapshot = {
    search: '',
    selectedSeats: [],
    selectedRoles: [],
    selectedAffiliations: [],
    selectedRaces: [],
    selectedGenders: [],
    selectedAlignments: [],
    selectedProfessions: [],
    selectedAcquisitions: [],
    selectedMechanics: [],
    selectedPatrons: [],
  }

  it('全空返回 false', () => {
    expect(hasActiveChampionFilters(empty)).toBe(false)
  })

  it('search 非空返回 true', () => {
    expect(hasActiveChampionFilters({ ...empty, search: 'bru' })).toBe(true)
  })

  it('selectedSeats 非空返回 true', () => {
    expect(hasActiveChampionFilters({ ...empty, selectedSeats: [1] })).toBe(true)
  })

  it('selectedRaces 非空返回 true', () => {
    expect(hasActiveChampionFilters({ ...empty, selectedRaces: ['dwarf'] })).toBe(true)
  })
})
