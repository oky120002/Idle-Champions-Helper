import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
    loadBinaryData: vi.fn(),
    loadChampionDetail: vi.fn(),
    loadCollection: vi.fn(),
  }
})

import { detailFixture } from './champion-detail/championDetailPageTestData'
import {
  mockChampionDetailCollections,
  mockedLoadChampionDetail,
  mockedLoadCollection,
  prepareChampionDetailDomEnvironment,
  renderChampionDetailPage,
  renderChampionDetailPageAt,
  restoreChampionDetailDomEnvironment,
  sectionTopMap,
} from './champion-detail/championDetailPageTestHarness'

beforeEach(() => {
  prepareChampionDetailDomEnvironment()
  mockChampionDetailCollections()
})

afterEach(() => {
  mockedLoadChampionDetail.mockReset()
  mockedLoadCollection.mockReset()
  restoreChampionDetailDomEnvironment()
  vi.restoreAllMocks()
})

describe('ChampionDetailPage navigation', () => {
  it('默认高亮概览分区', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    const overviewButtons = await screen.findAllByRole('button', { name: '概览' })
    const upgradeButtons = await screen.findAllByRole('button', { name: '升级' })

    overviewButtons.forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })
    upgradeButtons.forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed', 'false')
    })
    expect(screen.queryByText('快速索引')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(window.location.hash).toBe('#/champions/7#section-overview')
    })
  })

  it('点击分区导航后会同步高亮顶部按钮', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    const upgradeButtons = await screen.findAllByRole('button', { name: '升级' })
    fireEvent.click(upgradeButtons[0]!)

    screen.getAllByRole('button', { name: '升级' }).forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })
    screen.getAllByRole('button', { name: '概览' }).forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed', 'false')
    })
    await waitFor(() => {
      expect(window.location.hash).toBe('#/champions/7#section-upgrades')
    })
  })

  it('带分区 hash 进入时会直达对应分区并保留该 hash', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    window.history.replaceState(window.history.state, '', '/#/champions/7#section-upgrades')
    renderChampionDetailPageAt('/champions/7#section-upgrades')

    await waitFor(() => {
      screen.getAllByRole('button', { name: '升级' }).forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed', 'true')
      })
    })
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    await waitFor(() => {
      expect(window.location.hash).toBe('#/champions/7#section-upgrades')
    })
  })

  it('滚动激活新的分区时不会再被 hash 定位拉回原处', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    await screen.findByRole('heading', { level: 2, name: '明斯克' })
    const contentScroll = document.querySelector('.page-workbench__content-scroll')

    if (!(contentScroll instanceof HTMLDivElement)) {
      throw new Error('详情工作台右侧滚动容器不存在。')
    }

    Object.assign(sectionTopMap, {
      overview: -360,
      'character-sheet': -280,
      combat: -220,
      upgrades: 120,
      feats: 720,
    })

    fireEvent.scroll(contentScroll)

    await waitFor(() => {
      screen.getAllByRole('button', { name: '升级' }).forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed', 'true')
      })
    })

    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(window.location.hash).toBe('#/champions/7#section-upgrades')
    })
  })
})
