import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
    loadCollection: vi.fn(),
  }
})

import {
  installClipboardMock,
  mockIllustrationsPageCollections,
  mockedLoadCollection,
  renderIllustrationsPage,
} from './illustrations-page/illustrationsPageTestHarness'

describe('IllustrationsPage filters', () => {
  beforeEach(() => {
    window.localStorage.clear()
    installClipboardMock()
    mockIllustrationsPageCollections()
  })

  afterEach(() => {
    window.localStorage.clear()
    mockedLoadCollection.mockReset()
    vi.restoreAllMocks()
  })

  it('把筛选状态收进左侧工具栏，并移除右侧重复的命中徽标', async () => {
    const user = userEvent.setup()

    renderIllustrationsPage()

    expect(await screen.findByLabelText('立绘结果')).toBeInTheDocument()
    expect(screen.getByText('条件待命', { selector: '.workbench-page__toolbar-lead-status' })).toBeInTheDocument()
    expect(screen.queryByText('3 命中')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '皮肤' }))

    expect(screen.getByText('1 项条件', { selector: '.workbench-page__toolbar-lead-status' })).toBeInTheDocument()
    expect(screen.queryByText('1 命中')).not.toBeInTheDocument()
  })

  it('渲染本地立绘目录并支持筛选皮肤立绘', async () => {
    const user = userEvent.setup()

    renderIllustrationsPage()

    expect(await screen.findByText('筛选抽屉')).toBeInTheDocument()
    const results = await screen.findByLabelText('立绘结果')
    expect(within(results).getByRole('img', { name: '布鲁诺本体立绘' })).toHaveAttribute(
      'src',
      '/data/v1/champion-illustrations/heroes/1.png',
    )
    expect(within(results).getByRole('img', { name: '布鲁诺海盗布鲁诺皮肤立绘' })).toHaveAttribute(
      'src',
      '/data/v1/champion-illustrations/skins/3001.png',
    )

    await user.click(screen.getByRole('button', { name: '皮肤' }))

    expect(screen.queryByRole('img', { name: '布鲁诺本体立绘' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: '布鲁诺海盗布鲁诺皮肤立绘' })).toBeInTheDocument()
  })

  it('支持按英雄定位过滤立绘结果', async () => {
    const user = userEvent.setup()

    renderIllustrationsPage()

    await screen.findByLabelText('立绘结果')
    await user.click(screen.getByRole('button', { name: '坦克' }))

    expect(screen.getByRole('img', { name: '提里尔本体立绘' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '布鲁诺本体立绘' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '布鲁诺海盗布鲁诺皮肤立绘' })).not.toBeInTheDocument()
  })

  it('支持展开补充筛选，并按种族与获取方式过滤立绘结果', async () => {
    const user = userEvent.setup()

    renderIllustrationsPage()

    await screen.findByLabelText('立绘结果')

    await user.click(screen.getByRole('button', { name: /身份画像/ }))
    await user.click(screen.getByRole('button', { name: /玩法标签/ }))
    await user.click(screen.getByRole('button', { name: '矮人' }))
    await user.click(screen.getByRole('button', { name: '活动英雄' }))

    expect(screen.getByRole('img', { name: '布鲁诺本体立绘' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '布鲁诺海盗布鲁诺皮肤立绘' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '提里尔本体立绘' })).not.toBeInTheDocument()
  })

  it('会把筛选状态同步进 URL 查询参数', async () => {
    const user = userEvent.setup()

    renderIllustrationsPage()

    await screen.findByLabelText('立绘结果')
    await user.click(screen.getByRole('button', { name: '皮肤' }))
    await user.click(screen.getByRole('button', { name: '辅助' }))

    const searchParams = new URLSearchParams(screen.getByTestId('location-search').textContent ?? '')

    expect(searchParams.get('scope')).toBe('skin')
    expect(searchParams.getAll('role')).toEqual(['support'])
  })

  it('卡片标题在中文模式下只显示当前语言，并把皮肤名和英雄本名合并到同一行', async () => {
    renderIllustrationsPage()

    const baseCard = await screen.findByRole('link', { name: '查看英雄：布鲁诺（布鲁诺）' })
    const skinCard = screen.getByRole('link', { name: '查看英雄：布鲁诺（海盗布鲁诺）' })
    const baseTitle = within(baseCard).getByRole('heading', { name: '布鲁诺' })
    const skinTitle = within(skinCard).getByRole('heading', { level: 3 })

    expect(baseTitle).toBeInTheDocument()
    expect(within(baseCard).queryByText('Bruenor')).not.toBeInTheDocument()
    expect(skinTitle).toHaveAttribute('title', '海盗布鲁诺 · 布鲁诺')
    expect(skinTitle).toHaveTextContent(/海盗布鲁诺\s*·\s*布鲁诺/)
    expect(within(skinCard).queryByText('Pirate Bruenor')).not.toBeInTheDocument()
  })

  it('卡片标题在英文模式下只显示当前语言，并保留单行联合展示', async () => {
    window.localStorage.setItem('idle-champions-helper.locale', 'en-US')

    renderIllustrationsPage()

    const baseCard = await screen.findByRole('link', { name: 'Open champion: Bruenor (Bruenor)' })
    const skinCard = screen.getByRole('link', { name: 'Open champion: Bruenor (Pirate Bruenor)' })
    const baseTitle = within(baseCard).getByRole('heading', { name: 'Bruenor' })
    const skinTitle = within(skinCard).getByRole('heading', { level: 3 })

    expect(baseTitle).toBeInTheDocument()
    expect(within(baseCard).queryByText('布鲁诺')).not.toBeInTheDocument()
    expect(skinTitle).toHaveAttribute('title', 'Pirate Bruenor · Bruenor')
    expect(skinTitle).toHaveTextContent(/Pirate Bruenor\s*·\s*Bruenor/)
    expect(within(skinCard).queryByText('海盗布鲁诺')).not.toBeInTheDocument()
  })

  it('支持复制当前筛选链接', async () => {
    const user = userEvent.setup()
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText')

    renderIllustrationsPage()

    await screen.findByLabelText('立绘结果')
    await user.click(screen.getByRole('button', { name: '皮肤' }))
    await user.click(screen.getByRole('button', { name: '辅助' }))

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('?scope=skin&role=support')
    })

    await user.click(screen.getByRole('button', { name: '复制当前页面链接' }))

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledTimes(1)
    })

    const copiedUrl = writeTextSpy.mock.calls[0]?.[0]

    expect(copiedUrl).toContain('#/illustrations?scope=skin&role=support')
    expect(screen.getByRole('button', { name: '已复制链接' })).toBeInTheDocument()
  })

  it('会在 URL 查询参数变化后重新同步立绘筛选 UI', async () => {
    const { router } = renderIllustrationsPage(['/illustrations?scope=skin&role=support'])

    await screen.findByLabelText('立绘结果')

    expect(screen.getByRole('button', { name: '皮肤' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '辅助' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('img', { name: '布鲁诺海盗布鲁诺皮肤立绘' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '提里尔本体立绘' })).not.toBeInTheDocument()

    await router.navigate('/illustrations?scope=hero-base&role=tank')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '本体' })).toHaveAttribute('aria-pressed', 'true')
    })

    expect(screen.getByRole('button', { name: '皮肤' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '坦克' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '辅助' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('location-search')).toHaveTextContent('?scope=hero-base&role=tank')
    expect(screen.getByRole('img', { name: '提里尔本体立绘' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '布鲁诺海盗布鲁诺皮肤立绘' })).not.toBeInTheDocument()
  })
})
