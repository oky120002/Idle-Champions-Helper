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
    installClipboardMock()
    mockIllustrationsPageCollections()
  })

  afterEach(() => {
    mockedLoadCollection.mockReset()
    vi.restoreAllMocks()
  })

  it('渲染本地立绘目录并支持筛选皮肤立绘', async () => {
    const user = userEvent.setup()

    renderIllustrationsPage()

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

    await user.click(screen.getByRole('button', { name: '复制当前链接' }))

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledTimes(1)
    })

    const copiedUrl = writeTextSpy.mock.calls[0]?.[0]

    expect(copiedUrl).toContain('#/illustrations?scope=skin&role=support')
    expect(screen.getByRole('button', { name: '已复制链接' })).toBeInTheDocument()
  })
})
