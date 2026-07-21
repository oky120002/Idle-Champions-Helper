import { describe, expect, it } from 'vitest'
import type { ChampionDetail } from '../../domain/types'
import { createOwnedHero } from '../../domain/user-profile/fixtures'
import {
  buildChampionEquipmentSlots,
  buildChampionRosterSeatColumns,
  buildChampionRosterSummary,
} from './championRoster'
import { championsFixture } from './championsPageTestData'

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
          maxLevel: null,
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
          maxLevel: [500, 250, 125],
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
        levelCap: 125,
        legendaryLevel: 5,
        legendaryCap: 20,
      },
    ])
  })

  it('旧版详情缺少归一化 maxLevel 时，回退读取 raw loot 的 max_level', () => {
    const ownedHero = createOwnedHero({
      heroId: 'alpha',
      lootBySlot: {
        6: { slotId: '6', rarity: 4, gild: 1, enchant: 88, pigment: 0, found: { 4: 1 } },
      },
    })
    const detail = {
      loot: [
        {
          id: 'slot-6-epic',
          name: { original: 'Finest Cloak', display: '精致的斗篷' },
          description: { original: 'Epic', display: '史诗' },
          graphicId: '14567',
          slotId: 6,
          rarity: '4',
          maxLevel: null,
          effects: [],
          allowGoldenEpic: true,
          isGoldenEpic: false,
        },
      ],
      raw: {
        loot: [
          {
            snapshots: {
              original: {
                slot_id: 6,
                max_level: [500, 250, 125],
              },
              display: {
                slot_id: 6,
                max_level: [500, 250, 125],
              },
            },
          },
        ],
      },
    } as unknown as ChampionDetail

    expect(buildChampionEquipmentSlots(detail, ownedHero, 20)).toEqual([
      {
        slotId: '6',
        name: '精致的斗篷',
        description: '史诗',
        rarity: 4,
        gild: 1,
        enchant: 88,
        pigment: 0,
        found: { 4: 1 },
        hasIconBackground: true,
        graphicId: '14567',
        levelCap: 250,
        legendaryLevel: 0,
        legendaryCap: 0,
      },
    ])
  })

  it('装备槽没有等级上限时，仅返回当前等级不计算 cap', () => {
    const ownedHero = createOwnedHero({
      heroId: 'alpha',
      lootBySlot: {
        2: { slotId: '2', rarity: 3, gild: 0, enchant: 77, pigment: 0, found: { 3: 1 } },
      },
    })
    const detail = {
      loot: [
        {
          id: 'slot-2-rare',
          name: { original: 'Traveler Boots', display: '旅者长靴' },
          description: { original: 'Rare', display: '稀有' },
          graphicId: '24567',
          slotId: 2,
          rarity: '3',
          maxLevel: null,
          effects: [],
          allowGoldenEpic: true,
          isGoldenEpic: false,
        },
      ],
      raw: {
        loot: [],
      },
    } as unknown as ChampionDetail

    expect(buildChampionEquipmentSlots(detail, ownedHero, 20)).toEqual([
      {
        slotId: '2',
        name: '旅者长靴',
        description: '稀有',
        rarity: 3,
        gild: 0,
        enchant: 77,
        pigment: 0,
        found: { 3: 1 },
        hasIconBackground: true,
        graphicId: '24567',
        levelCap: null,
        legendaryLevel: 0,
        legendaryCap: 0,
      },
    ])
  })
})
