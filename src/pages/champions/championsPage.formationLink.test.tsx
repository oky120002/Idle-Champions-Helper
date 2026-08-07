import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../data/client', () => ({
  loadCollection: vi.fn(),
  loadVersion: vi.fn(),
}))

import { loadVersion } from '../../data/client'
import { mockChampionsPageCollections, renderChampionsPage } from './championsPageTestHarness'

const mockedLoadVersion = vi.mocked(loadVersion)

describe('ChampionsPage formation filter link', () => {
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

  it('无活跃筛选时不显示入口', async () => {
    renderChampionsPage()

    await screen.findByText('阿尔法')
    expect(screen.queryByRole('link', { name: /带着当前筛选去摆阵型/ })).not.toBeInTheDocument()
  })

  it('有活跃筛选时显示入口且 href 含筛选参数', async () => {
    const user = userEvent.setup()

    renderChampionsPage()
    await screen.findByText('阿尔法')

    await user.click(screen.getByRole('button', { name: '1 号位' }))

    const link = screen.getByRole('link', { name: /带着当前筛选去摆阵型/ })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toContain('seat=1')
  })
})
