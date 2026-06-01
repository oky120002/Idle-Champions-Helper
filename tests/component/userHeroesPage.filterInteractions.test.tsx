import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createOwnedHero } from '../../src/domain/user-profile/fixtures'
import {
  mockUserHeroesPageCollections,
  mockUserHeroesProfile,
  mockedLoadChampionDetail,
  mockedLoadCollection,
  mockedLoadVersion,
  mockedResolveUserProfileSnapshot,
  renderUserHeroesPage,
} from './user-heroes-page/userHeroesPageTestHarness'

describe('UserHeroesPage filters', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    mockUserHeroesPageCollections()
    mockUserHeroesProfile({
      ownedHeroes: [
        createOwnedHero({ heroId: 'alpha', level: 500 }),
        createOwnedHero({ heroId: 'beta', level: 400 }),
        createOwnedHero({ heroId: 'gamma', level: 300 }),
        createOwnedHero({ heroId: 'delta', level: 200 }),
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
})
