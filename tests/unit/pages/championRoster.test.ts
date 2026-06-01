import { describe, expect, it } from 'vitest'
import type { ChampionDetail } from '../../../src/domain/types'
import { createOwnedHero } from '../../../src/domain/user-profile/fixtures'
import {
  buildChampionEquipmentSlots,
  buildChampionRosterSeatColumns,
  buildChampionRosterSummary,
} from '../../../src/pages/champions/championRoster'
import { championsFixture } from '../../component/champions-page/championsPageTestData'

describe('champion roster helpers', () => {
  it('按 seat 构建全英雄矩阵，并把未命中或未拥有的英雄置为灰态', () => {
    const ownedHeroes = [
      createOwnedHero({ heroId: 'alpha' }),
      createOwnedHero({ heroId: 'gamma' }),
    ]
    const columns = buildChampionRosterSeatColumns(
      championsFixture.items,
      new Set(['alpha']),
      new Map(ownedHeroes.map((hero) => [hero.heroId, hero])),
    )

    expect(columns).toHaveLength(12)
    expect(columns[0]?.champions[0]).toMatchObject({
      champion: { id: 'alpha' },
      isOwned: true,
      matchesFilters: true,
      emphasis: 'match',
    })
    expect(columns[1]?.champions[0]).toMatchObject({
      champion: { id: 'beta' },
      isOwned: false,
      emphasis: 'dim-unowned',
    })
    expect(columns[1]?.champions[1]).toMatchObject({
      champion: { id: 'gamma' },
      isOwned: true,
      matchesFilters: false,
      emphasis: 'dim-owned',
    })
  })

  it('汇总已拥有英雄、史诗/闪耀/金装/传奇槽位进度', () => {
    const summary = buildChampionRosterSummary(
      championsFixture.items,
      [
        createOwnedHero({
          heroId: 'alpha',
          lootBySlot: {
            1: { slotId: '1', rarity: 4, gild: 1, enchant: 50, pigment: 0, found: {} },
            2: { slotId: '2', rarity: 4, gild: 2, enchant: 60, pigment: 0, found: {} },
          },
          legendaryBySlot: {
            2: { slotId: '2', level: 3, effectId: '7', effectIds: ['7'], resetCurrencyId: '3', upgradeCost: 499 },
          },
        }),
      ],
      new Set(['alpha', 'beta']),
    )

    expect(summary.ownedChampionCount).toBe(1)
    expect(summary.totalChampionCount).toBe(championsFixture.items.length)
    expect(summary.matchedOwnedChampionCount).toBe(1)
    expect(summary.metrics.find((metric) => metric.id === 'epic-slots')).toMatchObject({ value: 2, total: 6 })
    expect(summary.metrics.find((metric) => metric.id === 'shiny-slots')).toMatchObject({ value: 1, total: 6 })
    expect(summary.metrics.find((metric) => metric.id === 'golden-slots')).toMatchObject({ value: 1, total: 6 })
    expect(summary.metrics.find((metric) => metric.id === 'legendary-slots')).toMatchObject({ value: 1, total: 6 })
  })

  it('把详情页装备定义和账号槽位数据合并成浮层卡片', () => {
    const ownedHero = createOwnedHero({
      heroId: 'alpha',
      lootBySlot: {
        1: { slotId: '1', rarity: 4, gild: 2, enchant: 321, pigment: 0, found: { 4: 1 } },
      },
      legendaryBySlot: {
        1: { slotId: '1', level: 5, effectId: '9', effectIds: ['9'], resetCurrencyId: '3', upgradeCost: 499 },
      },
    })
    const detail = {
      loot: [
        {
          id: 'slot-1-rare',
          name: { original: 'Old Axe', display: '旧斧' },
          description: { original: 'Rare', display: '稀有' },
          graphicId: '1001',
          slotId: 1,
          rarity: '3',
          effects: [],
          allowGoldenEpic: true,
          isGoldenEpic: false,
        },
        {
          id: 'slot-1-epic',
          name: { original: 'Golden Axe', display: '金斧' },
          description: { original: 'Epic', display: '史诗' },
          graphicId: '1002',
          slotId: 1,
          rarity: '4',
          effects: [],
          allowGoldenEpic: true,
          isGoldenEpic: false,
        },
      ],
    } as unknown as ChampionDetail

    expect(buildChampionEquipmentSlots(detail, ownedHero, 20)).toEqual([
      {
        slotId: '1',
        name: '金斧',
        description: '史诗',
        rarity: 4,
        gild: 2,
        enchant: 321,
        pigment: 0,
        found: { 4: 1 },
        hasIconBackground: true,
        graphicId: '1002',
        legendaryLevel: 5,
        legendaryCap: 20,
      },
    ])
  })
})
