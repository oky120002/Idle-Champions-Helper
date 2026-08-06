import { describe, expect, it } from 'vitest'
import type { Champion, ChampionIllustration, ChampionPatronEligibility, LocalizedText } from '../domain/types'
import { filterIllustrations, type FilterableIllustration } from './illustrationFilter'

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
  roles: string[],
  affiliations: LocalizedText[],
  patronEligibility?: ChampionPatronEligibility,
): Champion {
  return {
    id,
    name: localized(id, id),
    seat: 1,
    roles,
    affiliations,
    tags: [],
    ...(patronEligibility ? { patronEligibility } : {}),
  }
}

function createIllustration(championId: string): ChampionIllustration {
  return {
    id: `hero:${championId}`,
    championId,
    skinId: null,
    kind: 'hero-base',
    seat: 1,
    championName: localized(championId, championId),
    illustrationName: localized(championId, championId),
    portraitPath: 'default.png',
    sourceSlot: 'base',
    sourceGraphicId: `g-${championId}`,
    sourceGraphic: `Characters/${championId}`,
    sourceVersion: 1,
    render: {
      pipeline: 'skelanim',
      sequenceIndex: 0,
      sequenceLength: 1,
      isStaticPose: true,
      frameIndex: 0,
      visiblePieceCount: 18,
      bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    },
    image: {
      path: `heroes/${championId}.png`,
      width: 1024,
      height: 1024,
      bytes: 1000,
      format: 'png',
    },
  }
}

const hall = localized('Companions of the Hall', '大厅伙伴团')
const adversaries = localized('Absolute Adversaries', '绝对宿敌')

const championMap = new Map<string, Champion>([
  ['alpha', createChampion('alpha', ['support'], [hall], patronEligibility('1', '2'))],
  ['beta', createChampion('beta', ['healing'], [hall], patronEligibility('1'))],
  ['gamma', createChampion('gamma', ['dps'], [adversaries], patronEligibility('2', '3'))],
  ['delta', createChampion('delta', ['tank'], [adversaries])],
])

const entries: FilterableIllustration[] = ['alpha', 'beta', 'gamma', 'delta'].map((championId) => ({
  illustration: createIllustration(championId),
  champion: championMap.get(championId) ?? null,
}))

const emptyFilters = {
  search: '',
  seats: [],
  kinds: [],
  roles: [],
  affiliations: [],
  races: [],
  genders: [],
  professions: [],
  alignments: [],
  acquisitions: [],
  mechanics: [],
  patrons: [],
}

describe('filterIllustrations', () => {
  it('赞助人过滤：只显示命中 eligiblePatronIds 的英雄立绘，多选按或匹配', () => {
    expect(
      filterIllustrations(entries, { ...emptyFilters, patrons: ['1', '3'] }).map(
        (entry) => entry.illustration.championId,
      ),
    ).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('赞助人过滤：无 patronEligibility 或未命中的英雄立绘不显示', () => {
    expect(
      filterIllustrations(entries, { ...emptyFilters, patrons: ['5'] }).map(
        (entry) => entry.illustration.championId,
      ),
    ).toEqual([])
  })

  it('赞助人过滤为空时全部通过', () => {
    expect(
      filterIllustrations(entries, { ...emptyFilters }).map((entry) => entry.illustration.championId),
    ).toEqual(['alpha', 'beta', 'gamma', 'delta'])
  })
})
