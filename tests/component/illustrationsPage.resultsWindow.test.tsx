import { screen, within } from '@testing-library/react'
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
  buildBruenorOnlyChampionsFixture,
  buildBruenorOnlyEnumsFixture,
  buildCrowdedIllustrationsFixture,
} from './illustrations-page/illustrationsPageTestData'
import {
  installClipboardMock,
  mockIllustrationsPageCollections,
  mockedLoadCollection,
  renderIllustrationsPage,
} from './illustrations-page/illustrationsPageTestHarness'

describe('IllustrationsPage results window', () => {
  beforeEach(() => {
    installClipboardMock()
    mockIllustrationsPageCollections()
  })

  afterEach(() => {
    mockedLoadCollection.mockReset()
    vi.restoreAllMocks()
  })

  it('默认只渲染首批立绘，展开后再显示全部', async () => {
    const user = userEvent.setup()

    mockIllustrationsPageCollections({
      illustrations: buildCrowdedIllustrationsFixture({
        idPrefix: 'crowded',
        englishNamePrefix: 'Bruenor Variant',
        chineseNamePrefix: '布鲁诺变体',
        sourceGraphicPrefix: 'Characters/Hero_Bruenor',
        count: 52,
      }),
      champions: buildBruenorOnlyChampionsFixture(),
      enums: buildBruenorOnlyEnumsFixture(),
    })

    renderIllustrationsPage()

    const results = await screen.findByLabelText('立绘结果')
    expect(within(results).getAllByRole('img')).toHaveLength(50)

    await user.click(screen.getByRole('button', { name: '显示全部 52（默认 50）' }))

    expect(within(results).getAllByRole('img')).toHaveLength(52)
  })

  it('支持从 URL 恢复筛选和展开状态', async () => {
    mockIllustrationsPageCollections({
      illustrations: buildCrowdedIllustrationsFixture({
        idPrefix: 'shared',
        englishNamePrefix: 'Bruenor Shared',
        chineseNamePrefix: '布鲁诺共享',
        sourceGraphicPrefix: 'Characters/Hero_Bruenor_Shared',
        count: 52,
      }),
      champions: buildBruenorOnlyChampionsFixture(),
      enums: buildBruenorOnlyEnumsFixture(),
    })

    renderIllustrationsPage(['/illustrations?scope=skin&role=support&results=all'])

    const results = await screen.findByLabelText('立绘结果')
    expect(within(results).getAllByRole('img')).toHaveLength(52)
    expect(screen.getByRole('button', { name: '皮肤' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '辅助' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '收起到默认 50' })).toBeInTheDocument()
  })

  it('支持在当前筛选结果内重新随机排序', async () => {
    const user = userEvent.setup()

    mockIllustrationsPageCollections({
      illustrations: buildCrowdedIllustrationsFixture({
        idPrefix: 'shuffle',
        englishNamePrefix: 'Bruenor Shuffle',
        chineseNamePrefix: '布鲁诺乱序',
        sourceGraphicPrefix: 'Characters/Hero_Bruenor_Shuffle',
        count: 52,
      }),
      champions: buildBruenorOnlyChampionsFixture(),
      enums: buildBruenorOnlyEnumsFixture(),
    })

    renderIllustrationsPage()

    const results = await screen.findByLabelText('立绘结果')
    const beforeShuffle = within(results)
      .getAllByRole('img')
      .map((image) => image.getAttribute('alt'))

    await user.click(screen.getByRole('button', { name: '随机排序' }))

    const afterShuffle = within(results)
      .getAllByRole('img')
      .map((image) => image.getAttribute('alt'))

    expect(afterShuffle).toHaveLength(50)
    expect(afterShuffle).not.toEqual(beforeShuffle)
  })
})
