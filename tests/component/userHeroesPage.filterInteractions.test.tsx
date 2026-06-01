import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createOwnedHero } from '../../src/domain/user-profile/fixtures'
import type { OwnedHeroLegendarySlot, OwnedHeroLootSlot } from '../../src/domain/user-profile/types'
import {
  mockUserHeroesPageCollections,
  mockUserHeroesProfile,
  mockedLoadChampionDetail,
  mockedLoadCollection,
  mockedLoadVersion,
  mockedResolveUserProfileSnapshot,
  renderUserHeroesPage,
} from './user-heroes-page/userHeroesPageTestHarness'

function createLootSlot(overrides: Partial<OwnedHeroLootSlot> = {}): OwnedHeroLootSlot {
  return {
    slotId: '1',
    rarity: 1,
    gild: 0,
    enchant: 0,
    pigment: 0,
    found: {},
    ...overrides,
  }
}

function createLegendarySlot(overrides: Partial<OwnedHeroLegendarySlot> = {}): OwnedHeroLegendarySlot {
  return {
    slotId: '1',
    level: 1,
    effectId: null,
    effectIds: [],
    resetCurrencyId: null,
    upgradeCost: 0,
    ...overrides,
  }
}

describe('UserHeroesPage filters', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    mockUserHeroesPageCollections()
    mockUserHeroesProfile({
      ownedHeroes: [
        createOwnedHero({
          heroId: 'alpha',
          level: 500,
          lootBySlot: {
            '1': createLootSlot({ rarity: 4, gild: 1 }),
          },
        }),
        createOwnedHero({
          heroId: 'beta',
          level: 400,
          lootBySlot: {
            '1': createLootSlot({ rarity: 4 }),
            '2': createLootSlot({ slotId: '2', rarity: 3, gild: 2 }),
          },
        }),
        createOwnedHero({
          heroId: 'gamma',
          level: 300,
          lootBySlot: {
            '1': createLootSlot({ rarity: 3 }),
          },
          legendaryBySlot: {
            '1': createLegendarySlot(),
          },
        }),
        createOwnedHero({
          heroId: 'delta',
          level: 200,
          lootBySlot: {
            '1': createLootSlot(),
          },
        }),
      ],
    })
  })

  afterEach(() => {
    mockedLoadCollection.mockReset()
    mockedLoadVersion.mockReset()
    mockedLoadChampionDetail.mockReset()
    mockedResolveUserProfileSnapshot.mockReset()
  })

  it('座位筛选只改变已拥有英雄的高亮态，不会移除矩阵中的其它英雄', async () => {
    const user = userEvent.setup()

    renderUserHeroesPage()

    const alphaTile = await screen.findByRole('button', { name: '阿尔法，已拥有' })
    const betaTile = screen.getByRole('button', { name: '贝塔，已拥有' })
    const gammaTile = screen.getByRole('button', { name: '伽马，已拥有' })
    const deltaTile = screen.getByRole('button', { name: '德尔塔，已拥有' })

    expect(alphaTile).toHaveClass('champion-roster-tile--match')
    expect(deltaTile).toHaveClass('champion-roster-tile--match')

    await user.click(screen.getByRole('button', { name: '1 号位' }))
    await user.click(screen.getByRole('button', { name: '2 号位' }))

    expect(alphaTile).toHaveClass('champion-roster-tile--match')
    expect(betaTile).toHaveClass('champion-roster-tile--match')
    expect(gammaTile).toHaveClass('champion-roster-tile--match')
    expect(deltaTile).toHaveClass('champion-roster-tile--dim-owned')
    expect(screen.getByText('当前筛选：座位：1 号位、2 号位')).toBeInTheDocument()
  })

  it('没有命中时仍保留全矩阵，并提示当前只是全部降灰', async () => {
    const user = userEvent.setup()

    renderUserHeroesPage()

    expect(await screen.findByRole('button', { name: '阿尔法，已拥有' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '辅助' }))
    await user.click(screen.getByRole('button', { name: '牛冒险者公会' }))

    expect(screen.getByText(/当前筛选没有命中；矩阵仍保持全量显示/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '阿尔法，已拥有' })).toHaveClass('champion-roster-tile--dim-owned')
    expect(screen.getByRole('button', { name: '贝塔，已拥有' })).toHaveClass('champion-roster-tile--dim-owned')
    expect(screen.getByRole('button', { name: '伽马，已拥有' })).toHaveClass('champion-roster-tile--dim-owned')
    expect(screen.getByRole('button', { name: '德尔塔，已拥有' })).toHaveClass('champion-roster-tile--dim-owned')
  })

  it('点击顶部指标会切换高亮英雄，再次点击会取消该筛选', async () => {
    const user = userEvent.setup()

    mockUserHeroesProfile({
      ownedHeroes: [
        createOwnedHero({ heroId: 'alpha', level: 500 }),
        createOwnedHero({ heroId: 'beta', level: 400 }),
        createOwnedHero({ heroId: 'gamma', level: 300 }),
      ],
    })

    renderUserHeroesPage()

    const alphaTile = await screen.findByRole('button', { name: '阿尔法，已拥有' })
    const betaTile = screen.getByRole('button', { name: '贝塔，已拥有' })
    const gammaTile = screen.getByRole('button', { name: '伽马，已拥有' })
    const deltaTile = screen.getByRole('button', { name: '德尔塔，未拥有' })
    const ownedMetricButton = screen.getByRole('button', { name: /^已拥有英雄\s*3\/4/ })

    await user.click(ownedMetricButton)

    expect(alphaTile).toHaveClass('champion-roster-tile--match')
    expect(betaTile).toHaveClass('champion-roster-tile--match')
    expect(gammaTile).toHaveClass('champion-roster-tile--match')
    expect(deltaTile).toHaveClass('champion-roster-tile--dim-unowned')
    expect(screen.getByText('当前筛选：顶部指标：已拥有英雄')).toBeInTheDocument()

    await user.click(ownedMetricButton)

    expect(alphaTile).toHaveClass('champion-roster-tile--match')
    expect(betaTile).toHaveClass('champion-roster-tile--match')
    expect(gammaTile).toHaveClass('champion-roster-tile--match')
    expect(deltaTile).toHaveClass('champion-roster-tile--dim-unowned')
    expect(screen.queryByText('当前筛选：顶部指标：已拥有英雄')).not.toBeInTheDocument()
  })

  it('顶部指标筛选会与左侧筛选做交集叠加', async () => {
    const user = userEvent.setup()

    renderUserHeroesPage()

    const alphaTile = await screen.findByRole('button', { name: '阿尔法，已拥有' })
    const betaTile = screen.getByRole('button', { name: '贝塔，已拥有' })
    const gammaTile = screen.getByRole('button', { name: '伽马，已拥有' })
    const deltaTile = screen.getByRole('button', { name: '德尔塔，已拥有' })

    await user.click(screen.getByRole('button', { name: '2 号位' }))
    await user.click(screen.getByRole('button', { name: /^传奇装备位/ }))

    expect(alphaTile).toHaveClass('champion-roster-tile--dim-owned')
    expect(betaTile).toHaveClass('champion-roster-tile--dim-owned')
    expect(gammaTile).toHaveClass('champion-roster-tile--match')
    expect(deltaTile).toHaveClass('champion-roster-tile--dim-owned')
    expect(screen.getByText('当前筛选：座位：2 号位 · 顶部指标：传奇装备位')).toBeInTheDocument()
  })
})
