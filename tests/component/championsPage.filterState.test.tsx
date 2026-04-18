import { screen, waitFor, within } from '@testing-library/react'
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

describe('ChampionsPage filter state', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    mockChampionsPageCollections()
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

  it('无匹配时仍可通过唯一的清空入口快速回到全量结果', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('搜英雄名、标签、联动队伍'), '德')
    await user.click(screen.getByRole('button', { name: '1 号位' }))

    expect(
      screen.getByText(
        '当前筛选条件下没有匹配英雄。可以直接点左侧已选条件逐项回退，或用筛选头部的清空全部重新开始。',
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '清空全部' })).toHaveLength(1)

    await user.click(within(screen.getByRole('group', { name: '筛选状态操作' })).getByRole('button', { name: '清空全部' }))

    await waitFor(() => {
      expect(screen.getByText('阿尔法')).toBeInTheDocument()
    })

    expect(screen.getByPlaceholderText('搜英雄名、标签、联动队伍')).toHaveValue('')
  })

  it('支持从 URL 恢复筛选条件，并恢复上次滚动位置', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const search = '?q=alpha&seat=1&role=support&race=human&mechanic=control_slow'
    window.sessionStorage.setItem(`champions-page-scroll:${search}`, '640')

    renderChampionsPage([`/champions${search}`])

    expect(await screen.findByDisplayValue('alpha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1 号位' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '辅助' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '人类' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '减速控制' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('阿尔法')).toBeInTheDocument()
    expect(screen.queryByText('贝塔')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 640, left: 0, behavior: 'auto' })
    })

    expect(window.sessionStorage.getItem(`champions-page-scroll:${search}`)).toBeNull()
    expect(screen.getByRole('link', { name: '查看详情：阿尔法' })).toHaveAttribute(
      'href',
      '/champions/alpha?q=alpha&seat=1&role=support&race=human&mechanic=control_slow',
    )
  })

  it('默认先展示 48 名英雄，并支持切换到显示全部再收起', async () => {
    const user = userEvent.setup()

    mockChampionsPageCollections({
      champions: manyChampionsFixture,
    })
    renderChampionsPage()

    expect(await screen.findByText('测试英雄 1')).toBeInTheDocument()
    expect(screen.getByText('默认先展示 48 名英雄')).toBeInTheDocument()
    expect(screen.getByText(/^当前展示 48 \/ 60 名英雄/)).toBeInTheDocument()
    expect(screen.queryByText('测试英雄 60')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '显示全部 60 名' }))

    await waitFor(() => {
      expect(screen.getByText('测试英雄 60')).toBeInTheDocument()
    })

    expect(screen.getByText(/^当前展示 60 \/ 60 名英雄/)).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: '收起到默认 48 名' })[0]!)

    await waitFor(() => {
      expect(screen.queryByText('测试英雄 60')).not.toBeInTheDocument()
    })

    expect(screen.getByText(/^当前展示 48 \/ 60 名英雄/)).toBeInTheDocument()
  })

  it('会在 URL 查询参数变化后重新同步筛选 UI', async () => {
    const { router } = renderChampionsPage(['/champions?seat=1&role=support'])

    expect(await screen.findByRole('button', { name: '1 号位' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '辅助' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('阿尔法')).toBeInTheDocument()
    expect(screen.queryByText('德尔塔')).not.toBeInTheDocument()

    await router.navigate('/champions?seat=3&role=tank')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '3 号位' })).toHaveAttribute('aria-pressed', 'true')
    })

    expect(screen.getByRole('button', { name: '1 号位' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '坦克' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '辅助' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('location-search')).toHaveTextContent('?seat=3&role=tank')
    expect(screen.getByText('德尔塔')).toBeInTheDocument()
    expect(screen.queryByText('阿尔法')).not.toBeInTheDocument()
  })
})
