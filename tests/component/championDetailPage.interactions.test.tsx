import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
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
  restoreChampionDetailDomEnvironment,
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

describe('ChampionDetailPage interactions', () => {
  it('默认收起自身增伤和全队增伤，并允许按类型重新展开等级列表', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    await screen.findByRole('heading', { level: 2, name: '明斯克' })

    expect(screen.getByRole('button', { name: /自身增伤/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /全队增伤/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /金币加成/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('自身伤害提高 100%')).not.toBeInTheDocument()
    expect(screen.queryByText('全队伤害提高 200%')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /自身增伤/ }))
    fireEvent.click(screen.getByRole('button', { name: /全队增伤/ }))

    expect(screen.getByText('自身伤害提高 100%')).toBeInTheDocument()
    expect(screen.getByText('全队伤害提高 200%')).toBeInTheDocument()
  })

  it('支持在悬浮预览里切换不同皮肤', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    await screen.findByRole('heading', { level: 2, name: '明斯克' })

    fireEvent.click(screen.getByRole('button', { name: '打开皮肤立绘预览' }))

    expect(screen.getByRole('dialog', { name: '皮肤立绘预览' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('img', { name: '巨型布布服装皮肤预览' })).toHaveAttribute(
        'src',
        '/data/v1/champion-illustrations/skins/4.png',
      )
    })
    await waitFor(() => {
      expect(screen.getByText('已命中')).toBeInTheDocument()
      expect(screen.getByText('large')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '切换皮肤：太空布布远征装' }))

    await waitFor(() => {
      expect(screen.getByRole('img', { name: '太空布布远征装皮肤预览' })).toHaveAttribute(
        'src',
        '/data/v1/champion-illustrations/skins/5.png',
      )
    })
  })
})
