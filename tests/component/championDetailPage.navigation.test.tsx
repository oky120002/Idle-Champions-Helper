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
  it('默认高亮专精 tab', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    const specializationsTab = await screen.findByRole('tab', { name: '专精' })
    const abilitiesTab = await screen.findByRole('tab', { name: '能力' })

    expect(specializationsTab).toHaveAttribute('aria-selected', 'true')
    expect(abilitiesTab).toHaveAttribute('aria-selected', 'false')
    expect(screen.queryByText('快速索引')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(window.location.hash).toBe('#/champions/7#section-specializations')
    })
  })

  it('点击 tab 后会同步高亮和 hash', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    fireEvent.click(await screen.findByRole('tab', { name: '天赋' }))

    expect(screen.getByRole('tab', { name: '天赋' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: '专精' })).toHaveAttribute('aria-selected', 'false')
    await waitFor(() => {
      expect(window.location.hash).toBe('#/champions/7#section-feats')
    })
  })

  it('带旧分区 hash 进入时会映射到新 tab', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    window.history.replaceState(window.history.state, '', '/#/champions/7#section-upgrades')
    renderChampionDetailPageAt('/champions/7#section-upgrades')

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '能力' })).toHaveAttribute('aria-selected', 'true')
    })
    await waitFor(() => {
      expect(window.location.hash).toBe('#/champions/7#section-abilities')
    })
  })

  it('切换 tab 后不会再被初始 hash 定位拉回原处', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    await screen.findByRole('heading', { level: 2, name: '明斯克' })
    const contentScroll = document.querySelector('.page-workbench__content-scroll')

    if (!(contentScroll instanceof HTMLDivElement)) {
      throw new Error('详情工作台右侧滚动容器不存在。')
    }

    Object.assign(sectionTopMap, {
      specializations: -360,
      abilities: -280,
      loot: -220,
      legendary: -120,
      feats: 120,
      skins: 520,
      'story-misc': 920,
    })

    fireEvent.click(screen.getByRole('tab', { name: '天赋' }))
    fireEvent.scroll(contentScroll)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '天赋' })).toHaveAttribute('aria-selected', 'true')
    })

    await waitFor(() => {
      expect(window.location.hash).toBe('#/champions/7#section-feats')
    })
  })
})
