import { fireEvent, screen } from '@testing-library/react'
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
  renderChampionDetailPageWithBackRoute,
  renderChampionDetailPageWithLocationState,
  renderChampionDetailPageWithSearch,
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

describe('ChampionDetailPage content', () => {
  it('加载中会展示共享的状态卡片', () => {
    mockedLoadChampionDetail.mockImplementation(() => new Promise(() => {}))

    renderChampionDetailPage()

    expect(screen.getByRole('heading', { level: 2, name: '正在整理英雄卷宗…' })).toBeInTheDocument()
    expect(screen.getByText('正在读取详情数据…')).toBeInTheDocument()
  })

  it('按分区渲染英雄详情，并过滤无意义的详情区块', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    expect(await screen.findByRole('heading', { level: 2, name: '明斯克' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Specializations' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Specializations' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Abilities' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Loot' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Legendary' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Feats' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Skins' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Story & Misc' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Links' })).not.toBeInTheDocument()
    expect(screen.getByText('布布带路')).toBeInTheDocument()
    expect(screen.getByText('偏好敌人：类人生物')).toBeInTheDocument()
    expect(screen.queryByText('Favored Enemy: Humanoids')).not.toBeInTheDocument()
    expect(screen.getByText('类人生物敌人成为明斯克的偏好对手。')).toBeInTheDocument()
    expect(screen.getAllByText('当前可用').length).toBeGreaterThan(0)
    expect(screen.queryByText('未命名 upgrade_ability')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Abilities' }))
    expect(await screen.findByRole('heading', { level: 2, name: '基础数值、普攻、大招与活动升级' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Feats' }))
    expect(await screen.findByText('自身伤害提高 30%')).toBeInTheDocument()
    expect(screen.getByText('来源')).toBeInTheDocument()
    expect(screen.getByText('收藏')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Loot' }))
    expect(await screen.findByText('简单盾牌')).toBeInTheDocument()
    expect(screen.getByText('Golden Epic')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Legendary' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Legendary' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Skins' }))
    expect(await screen.findByText('巨型布布服装')).toBeInTheDocument()
    expect(screen.getAllByText('预览').length).toBeGreaterThan(0)
    expect(screen.queryByText(/下载/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Story & Misc' }))
    expect(await screen.findByRole('heading', { level: 2, name: '叙事资料与能力分布' })).toBeInTheDocument()
    expect(screen.getByText(/明斯克是一位有些迟钝但非常勇敢的巡林客/)).toBeInTheDocument()
    expect(screen.queryByText('商店上架时间')).not.toBeInTheDocument()
    expect(screen.getAllByText('周增益').length).toBeGreaterThan(0)
    expect(screen.queryByText('商店可得')).not.toBeInTheDocument()
    expect(screen.queryByText('时间门可得')).not.toBeInTheDocument()
    expect(screen.queryByText('下个活动可得')).not.toBeInTheDocument()
    expect(screen.queryByText(/更多说明/)).not.toBeInTheDocument()
    expect(screen.queryByText('软货币')).not.toBeInTheDocument()
    expect(screen.queryByText('Large Graphic ID')).not.toBeInTheDocument()
    expect(screen.queryByText('快速索引')).not.toBeInTheDocument()
  })

  it('在 404 时展示未找到状态', async () => {
    mockedLoadChampionDetail.mockRejectedValue(new Error('HTTP 404'))

    renderChampionDetailPage()

    expect(await screen.findByRole('heading', { level: 2, name: '没有找到这个英雄' })).toBeInTheDocument()
  })

  it('在非 404 错误时展示读取失败状态', async () => {
    mockedLoadChampionDetail.mockRejectedValue(new Error('boom'))

    renderChampionDetailPage()

    expect(await screen.findByRole('heading', { level: 2, name: '详情数据读取失败' })).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  it('返回链接会带回筛选页查询参数', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPageWithSearch()

    expect(await screen.findByRole('link', { name: '返回英雄筛选' })).toHaveAttribute(
      'href',
      '/champions?q=alpha&seat=1&role=support',
    )
  })

  it('点击返回链接后不会被分区 hash 同步拉回详情页', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPageWithBackRoute('/champions/7?seat=7')

    expect(await screen.findByRole('link', { name: '返回英雄筛选' })).toHaveAttribute('href', '/champions?seat=7')
    fireEvent.click(await screen.findByRole('tab', { name: 'Feats' }))

    fireEvent.click(screen.getByRole('link', { name: '返回英雄筛选' }))

    expect(await screen.findByText('筛选页占位')).toBeInTheDocument()
  })

  it('从立绘图鉴进入时会优先返回立绘图鉴', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPageWithLocationState({
      pathname: '/champions/7',
      state: {
        returnTo: {
          pathname: '/illustrations',
          search: '?scope=skin',
        },
        returnLabel: {
          zh: '返回立绘图鉴',
          en: 'Back to illustrations',
        },
      },
    })

    expect(await screen.findByRole('link', { name: '返回立绘图鉴' })).toHaveAttribute('href', '/illustrations?scope=skin')
  })
})
