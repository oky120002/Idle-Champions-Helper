import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ChampionDetail } from '../../domain/types'
import { createOwnedHero } from '../../domain/user-profile/fixtures'
import {
  mockUserHeroesChampionDetails,
  mockUserHeroesPageCollections,
  mockUserHeroesProfile,
  mockedLoadChampionDetail,
  mockedLoadCollection,
  mockedLoadVersion,
  mockedResolveUserProfileSnapshot,
  renderUserHeroesPage,
} from './userHeroesPageTestHarness'

const alphaDetail = {
  loot: [
    {
      id: 'alpha-slot-1-epic',
      name: { original: 'Golden Axe', display: '金斧' },
      description: { original: 'Epic axe', display: '史诗近战加成' },
      graphicId: '1002',
      slotId: 1,
      rarity: '4',
      maxLevel: [500, 250, 125],
      effects: [],
      allowGoldenEpic: true,
      isGoldenEpic: false,
    },
    {
      id: 'alpha-slot-2-rare',
      name: { original: 'Traveler Boots', display: '旅者长靴' },
      description: { original: 'Rare boots', display: '稀有位移加成' },
      graphicId: '1003',
      slotId: 2,
      rarity: '3',
      maxLevel: null,
      effects: [],
      allowGoldenEpic: true,
      isGoldenEpic: false,
    },
  ],
} as unknown as ChampionDetail

describe('UserHeroesPage flyout', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    mockUserHeroesPageCollections({
      championEquipmentIcons: {
        updatedAt: '2026-06-01',
        items: [
          {
            graphicId: '1002',
            sourceGraphic: 'Items/HeroLoot/SwordEpic',
            sourceVersion: null,
            remotePath: 'mobile_assets/Items/HeroLoot/SwordEpic',
            remoteUrl: 'https://example.test/mobile_assets/Items/HeroLoot/SwordEpic',
            delivery: 'zlib-png',
            uses: ['hero_loot'],
            image: {
              path: 'v1/champion-equipment-icons/1002.png',
              width: 64,
              height: 64,
              bytes: 1024,
              format: 'png',
            },
          },
        ],
      },
    })
    mockUserHeroesProfile({
      ownedHeroes: [
        createOwnedHero({
          heroId: 'alpha',
          level: 987,
          lootBySlot: {
            1: { slotId: '1', rarity: 4, gild: 2, enchant: 321, pigment: 0, found: { 4: 1 } },
            2: { slotId: '2', rarity: 3, gild: 0, enchant: 77, pigment: 0, found: { 3: 1 } },
          },
          legendaryBySlot: {
            1: { slotId: '1', level: 5, effectId: '9', effectIds: ['9'], resetCurrencyId: '3', upgradeCost: 499 },
          },
        }),
      ],
    })
    mockUserHeroesChampionDetails({ alpha: alphaDetail })
  })

  afterEach(() => {
    mockedLoadCollection.mockReset()
    mockedLoadVersion.mockReset()
    mockedLoadChampionDetail.mockReset()
    mockedResolveUserProfileSnapshot.mockReset()
  })

  it('点击英雄后打开装备浮层，并保留返回用户英雄的跳转状态', async () => {
    const user = userEvent.setup()

    renderUserHeroesPage()

    await user.click(await screen.findByRole('button', { name: '阿尔法，已拥有' }))

    const flyout = await screen.findByRole('dialog', { name: '阿尔法 装备浮层' })
    const detailLink = within(flyout).getByRole('link', { name: /阿尔法/ })

    expect(detailLink).toHaveAttribute('href', '/champions/alpha')
    expect(within(flyout).getByText('金斧')).toBeInTheDocument()
    expect(within(flyout).getByText('稀有度 4/4')).toBeInTheDocument()
    expect(within(flyout).getByText('金装')).toBeInTheDocument()
    expect(within(flyout).queryByText('普通边框')).not.toBeInTheDocument()
    expect(flyout.querySelector('.champion-roster-slot__icon')).toHaveAttribute(
      'style',
      expect.stringContaining('v1/champion-equipment-icons/1002.png'),
    )
    expect(within(flyout).getByText('装备等级 321/125')).toBeInTheDocument()
    expect(within(flyout).getByText('装备等级 77')).toBeInTheDocument()
    expect(within(flyout).getByText('5/20')).toBeInTheDocument()
  })

  it('点击浮层外部后会关闭装备浮层', async () => {
    const user = userEvent.setup()

    renderUserHeroesPage()

    await user.click(await screen.findByRole('button', { name: '阿尔法，已拥有' }))
    expect(await screen.findByRole('dialog', { name: '阿尔法 装备浮层' })).toBeInTheDocument()

    await user.pointer({ keys: '[MouseLeft]', target: document.body })

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '阿尔法 装备浮层' })).not.toBeInTheDocument()
    })
  })
})
