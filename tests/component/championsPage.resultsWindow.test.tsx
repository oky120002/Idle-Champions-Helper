import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', () => ({
  loadCollection: vi.fn(),
  loadVersion: vi.fn(),
}))

import { loadVersion } from '../../src/data/client'
import { mockChampionsPageCollections, renderChampionsPage } from './champions-page/championsPageTestHarness'
import { manyChampionsFixture } from './champions-page/championsPageTestData'

const mockedLoadVersion = vi.mocked(loadVersion)

function readVisibleChampionNames() {
  return within(screen.getByLabelText('英雄筛选结果'))
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent ?? '')
}

describe('ChampionsPage results window', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    mockChampionsPageCollections({
      champions: manyChampionsFixture,
    })
    mockedLoadVersion.mockResolvedValue({
      current: 'v1',
      updatedAt: '2026-04-18',
      notes: [],
    })
  })

  afterEach(() => {
    mockedLoadVersion.mockReset()
    vi.restoreAllMocks()
  })

  it('支持在默认可见窗口内随机排序英雄结果', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('测试英雄 1')).toBeInTheDocument()

    const beforeShuffle = readVisibleChampionNames()
    expect(beforeShuffle).toHaveLength(48)

    await user.click(screen.getByRole('button', { name: '随机排序' }))

    const afterShuffle = readVisibleChampionNames()

    expect(afterShuffle).toHaveLength(48)
    expect(afterShuffle).not.toEqual(beforeShuffle)
    expect(screen.getByRole('button', { name: '重新随机' })).toBeInTheDocument()
  })

  it('随机排序只会打散当前筛选结果，不会混入其它英雄', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('测试英雄 1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '辅助' }))

    const beforeShuffle = readVisibleChampionNames()
    expect(beforeShuffle).toHaveLength(15)
    expect(screen.queryByRole('button', { name: /显示全部/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '随机排序' }))

    const afterShuffle = readVisibleChampionNames()

    expect(afterShuffle).toHaveLength(15)
    expect(afterShuffle).not.toEqual(beforeShuffle)
    expect([...afterShuffle].sort()).toEqual([...beforeShuffle].sort())
  })
})
