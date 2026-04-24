import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', () => ({
  loadCollection: vi.fn(),
  loadVersion: vi.fn(),
}))

import { loadVersion } from '../../src/data/client'
import { mockChampionsPageCollections, renderChampionsPage } from './champions-page/championsPageTestHarness'

const mockedLoadVersion = vi.mocked(loadVersion)

describe('ChampionsPage filters', () => {
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

  it('把筛选状态收进左侧工具栏，并移除右侧重复的命中徽标', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()
    expect(screen.getByText('条件待命', { selector: '.workbench-page__toolbar-lead-status' })).toBeInTheDocument()
    expect(screen.queryByText('4 命中')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '1 号位' }))

    expect(screen.getByText('1 项条件', { selector: '.workbench-page__toolbar-lead-status' })).toBeInTheDocument()
    expect(screen.queryByText('1 命中')).not.toBeInTheDocument()
  })

  it('支持座位多选，并且再次点击已选项会取消选择', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    const workbench = await screen.findByRole('region', { name: '英雄筛选工作台' })
    expect(within(workbench).getByText('英雄筛选', { selector: '.workbench-page__toolbar-title' })).toBeInTheDocument()
    const alphaName = await screen.findByText('阿尔法')
    expect(alphaName).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看详情：阿尔法' })).toHaveAttribute('href', '/champions/alpha')
    expect(alphaName.closest('a')).toHaveAttribute('href', '/champions/alpha')

    await user.click(screen.getByRole('button', { name: '1 号位' }))
    await user.click(screen.getByRole('button', { name: '2 号位' }))

    expect(screen.getByText('阿尔法')).toBeInTheDocument()
    expect(screen.getByText('贝塔')).toBeInTheDocument()
    expect(screen.getByText('伽马')).toBeInTheDocument()
    expect(screen.queryByText('德尔塔')).not.toBeInTheDocument()
    expect(screen.getByText('当前筛选：座位：1 号位、2 号位')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '1 号位' }))

    await waitFor(() => {
      expect(screen.queryByText('阿尔法')).not.toBeInTheDocument()
    })

    expect(screen.getByText('贝塔')).toBeInTheDocument()
    expect(screen.getByText('伽马')).toBeInTheDocument()
    expect(screen.getByText('当前筛选：座位：2 号位')).toBeInTheDocument()
  })

  it('支持定位和联动队伍多选，并继续按维度组合结果', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '辅助' }))
    await user.click(screen.getByRole('button', { name: '输出' }))
    await user.click(screen.getByRole('button', { name: '大厅伙伴团' }))
    await user.click(screen.getByRole('button', { name: '绝对宿敌' }))

    expect(screen.getByText('阿尔法')).toBeInTheDocument()
    expect(screen.getByText('伽马')).toBeInTheDocument()
    expect(screen.queryByText('贝塔')).not.toBeInTheDocument()
    expect(screen.queryByText('德尔塔')).not.toBeInTheDocument()
    expect(
      screen.getByText(
        '当前筛选：定位：辅助、输出 · 联动队伍：大厅伙伴团 · Companions of the Hall、绝对宿敌 · Absolute Adversaries',
      ),
    ).toBeInTheDocument()
  })

  it('结果卡会按当前筛选展示结构化属性分组', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    const alphaTitle = await screen.findByRole('heading', { level: 3, name: '阿尔法' })
    const alphaCard = alphaTitle.closest('a')

    expect(alphaCard).not.toBeNull()

    const alphaScope = within(alphaCard as HTMLElement)

    expect(alphaScope.getByText('种族')).toBeInTheDocument()
    expect(alphaScope.getByText('人类')).toBeInTheDocument()
    expect(alphaScope.getByText('性别')).toBeInTheDocument()
    expect(alphaScope.getByText('男性')).toBeInTheDocument()
    expect(alphaScope.getByText('阵营')).toBeInTheDocument()
    expect(alphaScope.getByText('善良')).toBeInTheDocument()
    expect(alphaScope.getByText('守序')).toBeInTheDocument()
    expect(alphaScope.getByText('职业')).toBeInTheDocument()
    expect(alphaScope.getByText('邪术师')).toBeInTheDocument()
    expect(alphaScope.queryByText('获取方式')).not.toBeInTheDocument()
    expect(alphaScope.queryByText('活动英雄')).not.toBeInTheDocument()
    expect(alphaScope.queryByText('第 2 年活动')).not.toBeInTheDocument()
    expect(alphaScope.queryByText('起始英雄')).not.toBeInTheDocument()
    expect(alphaScope.queryByText('特殊机制')).not.toBeInTheDocument()
    expect(alphaScope.queryByText('减速控制')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /来源与特殊机制/ }))
    await user.click(screen.getByRole('button', { name: '活动英雄' }))
    await user.click(screen.getByRole('button', { name: '减速控制' }))

    expect(alphaScope.getByText('获取方式')).toBeInTheDocument()
    expect(alphaScope.getByText('活动英雄')).toBeInTheDocument()
    expect(alphaScope.getByText('第 2 年活动')).toBeInTheDocument()
    expect(alphaScope.getByText('起始英雄')).toBeInTheDocument()
    expect(alphaScope.getByText('特殊机制')).toBeInTheDocument()
    expect(alphaScope.getByText('减速控制')).toBeInTheDocument()
  })

  it('默认把低频标签筛选折叠收纳，展开后才显示补充条件', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '人类' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '活动英雄' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /身份画像/ }))

    expect(screen.getByRole('button', { name: '人类' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '善良' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '活动英雄' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /来源与特殊机制/ }))

    expect(screen.getByRole('button', { name: '活动英雄' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '减速控制' })).toBeInTheDocument()
    expect(screen.getByText('控制效果')).toBeInTheDocument()
    expect(screen.getByText('专精方向')).toBeInTheDocument()
  })

  it('支持按种族、性别和职业筛选英雄', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /身份画像/ }))
    await user.click(screen.getByRole('button', { name: /来源与特殊机制/ }))
    await user.click(screen.getByRole('button', { name: '人类' }))
    await user.click(screen.getByRole('button', { name: '卓尔精灵' }))
    await user.click(screen.getByRole('button', { name: '男性' }))
    await user.click(screen.getByRole('button', { name: '邪术师' }))
    await user.click(screen.getByRole('button', { name: '盗贼' }))

    expect(screen.getByText('阿尔法')).toBeInTheDocument()
    expect(screen.getByText('伽马')).toBeInTheDocument()
    expect(screen.queryByText('贝塔')).not.toBeInTheDocument()
    expect(screen.queryByText('德尔塔')).not.toBeInTheDocument()
    expect(
      screen.getByText((content) => {
        return (
          content.includes('当前筛选：') &&
          content.includes('种族：') &&
          content.includes('人类') &&
          content.includes('卓尔精灵') &&
          content.includes('性别：男性') &&
          content.includes('职业：') &&
          content.includes('邪术师') &&
          content.includes('盗贼')
        )
      }),
    ).toBeInTheDocument()
  })

  it('支持按阵营、获取方式和机制筛选，并可单独清空已选维度', async () => {
    const user = userEvent.setup()

    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /身份画像/ }))
    await user.click(screen.getByRole('button', { name: /来源与特殊机制/ }))
    await user.click(screen.getByRole('button', { name: '善良' }))
    await user.click(screen.getByRole('button', { name: '活动英雄' }))
    await user.click(screen.getByRole('button', { name: '减速控制' }))

    expect(screen.getByText('阿尔法')).toBeInTheDocument()
    expect(screen.queryByText('贝塔')).not.toBeInTheDocument()
    expect(screen.queryByText('伽马')).not.toBeInTheDocument()
    expect(screen.queryByText('德尔塔')).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: '清空阵营：善良' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清空获取方式：活动英雄' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清空特殊机制：减速控制' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '清空全部' })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: '清空特殊机制：减速控制' }))

    await waitFor(() => {
      expect(screen.getByText('贝塔')).toBeInTheDocument()
    })

    expect(screen.getByText('阿尔法')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '清空特殊机制：减速控制' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清空阵营：善良' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清空获取方式：活动英雄' })).toBeInTheDocument()
    expect(screen.queryByText('伽马')).not.toBeInTheDocument()
    expect(screen.queryByText('德尔塔')).not.toBeInTheDocument()
  })
})
