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
      }),
      champions: buildBruenorOnlyChampionsFixture(),
      enums: buildBruenorOnlyEnumsFixture(),
    })

    renderIllustrationsPage()

    const results = await screen.findByLabelText('立绘结果')
    expect(within(results).getAllByRole('img')).toHaveLength(24)

    await user.click(screen.getByRole('button', { name: '显示全部 26 张' }))

    expect(within(results).getAllByRole('img')).toHaveLength(26)
  })

  it('支持从 URL 恢复筛选和展开状态', async () => {
    mockIllustrationsPageCollections({
      illustrations: buildCrowdedIllustrationsFixture({
        idPrefix: 'shared',
        englishNamePrefix: 'Bruenor Shared',
        chineseNamePrefix: '布鲁诺共享',
        sourceGraphicPrefix: 'Characters/Hero_Bruenor_Shared',
      }),
      champions: buildBruenorOnlyChampionsFixture(),
      enums: buildBruenorOnlyEnumsFixture(),
    })

    renderIllustrationsPage(['/illustrations?scope=skin&role=support&results=all'])

    const results = await screen.findByLabelText('立绘结果')
    expect(within(results).getAllByRole('img')).toHaveLength(26)
    expect(screen.getByRole('button', { name: '皮肤' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '辅助' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('button', { name: '收起到默认 24 张' })).toHaveLength(2)
  })
})
