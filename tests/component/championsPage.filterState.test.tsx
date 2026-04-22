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

function getMetricByText(text: string) {
  return Array.from(document.querySelectorAll('.page-header-metric')).find((element) => element.textContent === text)
}

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

    expect(getMetricByText('当前展示0 / 0')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: '清空全部' })).toHaveLength(1)

    await user.click(within(screen.getByRole('group', { name: '筛选状态操作' })).getByRole('button', { name: '清空全部' }))

    await waitFor(() => {
      expect(screen.getByText('阿尔法')).toBeInTheDocument()
    })

    expect(screen.getByPlaceholderText('搜英雄名、标签、联动队伍')).toHaveValue('')
  })

  it('支持从 URL 恢复筛选条件，并恢复上次滚动位置', async () => {
    const search = '?q=alpha&seat=1&role=support&race=human&mechanic=control_slow'
    window.sessionStorage.setItem(`workbench-pane-scroll:champions:${search}`, '640')

    renderChampionsPage([`/champions${search}`])

    expect(await screen.findByDisplayValue('alpha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1 号位' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '辅助' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '人类' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '减速控制' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('阿尔法')).toBeInTheDocument()
    expect(screen.queryByText('贝塔')).not.toBeInTheDocument()

    await waitFor(() => {
      const pane = document.querySelector('.page-workbench__content-scroll')

      if (!(pane instanceof HTMLElement)) {
        throw new Error('结果滚动面板不存在。')
      }

      expect(pane.scrollTop).toBe(640)
    })

    expect(window.sessionStorage.getItem(`workbench-pane-scroll:champions:${search}`)).toBeNull()
    expect(screen.getByRole('link', { name: '查看详情：阿尔法' })).toHaveAttribute(
      'href',
      '/champions/alpha?q=alpha&seat=1&role=support&race=human&mechanic=control_slow',
    )
  })

  it('默认先展示前 50 条结果，并支持切换到显示全部再收起', async () => {
    const user = userEvent.setup()

    mockChampionsPageCollections({
      champions: manyChampionsFixture,
    })
    renderChampionsPage()

    expect(await screen.findByText('测试英雄 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '显示全部 60（默认 50）' })).toBeInTheDocument()
    expect(getMetricByText('当前展示50 / 60')).toBeTruthy()
    expect(screen.queryByText('测试英雄 60')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '显示全部 60（默认 50）' }))

    await waitFor(() => {
      expect(screen.getByText('测试英雄 60')).toBeInTheDocument()
    })

    expect(getMetricByText('当前展示60 / 60')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '收起到默认 50' }))

    await waitFor(() => {
      expect(screen.queryByText('测试英雄 60')).not.toBeInTheDocument()
    })

    expect(getMetricByText('当前展示50 / 60')).toBeTruthy()
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
