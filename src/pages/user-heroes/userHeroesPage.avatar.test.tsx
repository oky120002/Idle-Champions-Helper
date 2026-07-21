import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  mockUserHeroesPageCollections,
  mockUserHeroesProfile,
  mockedLoadChampionDetail,
  mockedLoadCollection,
  mockedLoadVersion,
  mockedResolveUserProfileSnapshot,
  renderUserHeroesPage,
} from './userHeroesPageTestHarness'

describe('UserHeroesPage avatars', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    mockUserHeroesPageCollections()
    mockUserHeroesProfile()
  })

  afterEach(() => {
    mockedLoadCollection.mockReset()
    mockedLoadVersion.mockReset()
    mockedLoadChampionDetail.mockReset()
    mockedResolveUserProfileSnapshot.mockReset()
  })

  it('按 seat 列渲染英雄头像，并把未拥有英雄保持为灰态', async () => {
    renderUserHeroesPage()

    const results = await screen.findByLabelText('用户英雄结果')
    const seatOneColumn = within(results).getByRole('listitem', { name: 'Seat 1' })
    const tile = within(seatOneColumn).getByRole('button', { name: '阿尔法，未拥有' })

    expect(within(seatOneColumn).getByRole('heading', { name: '1号位' })).toBeInTheDocument()
    expect(within(tile).getByText('阿')).toBeInTheDocument()
    expect(tile).toHaveClass('champion-roster-tile--dim-unowned')
  })
})
