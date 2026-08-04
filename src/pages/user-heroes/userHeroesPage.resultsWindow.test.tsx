import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { manyChampionsFixture } from '../champions/championsPageTestData'
import {
  mockUserHeroesPageCollections,
  mockUserHeroesProfile,
  mockedLoadChampionDetail,
  mockedLoadCollection,
  mockedLoadVersion,
  mockedResolveUserProfileSnapshot,
  renderUserHeroesPage,
} from './userHeroesPageTestHarness'

describe('UserHeroesPage roster matrix', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    mockUserHeroesPageCollections({
      champions: manyChampionsFixture,
    })
    mockUserHeroesProfile()
  })

  afterEach(() => {
    mockedLoadCollection.mockReset()
    mockedLoadVersion.mockReset()
    mockedLoadChampionDetail.mockReset()
    mockedResolveUserProfileSnapshot.mockReset()
  })

  it('直接渲染完整英雄矩阵，不再使用旧图鉴的 50 条窗口', async () => {
    renderUserHeroesPage()

    const results = await screen.findByLabelText('用户英雄结果')
    const tiles = within(results).getAllByRole('button', { name: /测试英雄 \d+，未拥有/ })

    expect(tiles).toHaveLength(60)
    expect(within(results).getAllByRole('listitem')).toHaveLength(12)
    expect(screen.queryByRole('button', { name: /随机排序/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /显示全部/ })).not.toBeInTheDocument()
  })

  it('筛选后仍保留全矩阵，只更新命中统计', async () => {
    const user = userEvent.setup()

    renderUserHeroesPage()

    expect(await screen.findByText('测试英雄 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '辅助' }))

    const results = screen.getByLabelText('用户英雄结果')
    expect(within(results).getAllByRole('button', { name: /测试英雄 \d+，未拥有/ })).toHaveLength(60)
    expect(screen.getByText('当前筛选：定位：辅助')).toBeInTheDocument()
    expect(screen.getByText('15 个命中')).toBeInTheDocument()
  })
})
