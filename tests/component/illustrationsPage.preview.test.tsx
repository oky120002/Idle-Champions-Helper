import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
    loadCollection: vi.fn(),
  }
})

vi.mock('../../src/features/skelanim-player/SkelAnimCanvas', () => ({
  SkelAnimCanvas: ({ alt }: { alt: string }) => <div data-testid="skelanim-preview">{alt}</div>,
}))

import {
  installClipboardMock,
  mockIllustrationsPageCollections,
  mockedLoadCollection,
  renderIllustrationsPage,
} from './illustrations-page/illustrationsPageTestHarness'

describe('IllustrationsPage hover preview', () => {
  beforeEach(() => {
    installClipboardMock()
    mockIllustrationsPageCollections()
  })

  afterEach(() => {
    mockedLoadCollection.mockReset()
    vi.restoreAllMocks()
  })

  it('鼠标悬停卡片时会切到对应立绘的动态预览', async () => {
    const user = userEvent.setup()

    renderIllustrationsPage()

    const cardLink = await screen.findByRole('link', { name: '查看英雄：布鲁诺（布鲁诺）' })
    await waitFor(() => {
      expect(mockedLoadCollection).toHaveBeenCalledWith('champion-animations')
    })

    expect(screen.queryByTestId('skelanim-preview')).not.toBeInTheDocument()

    await user.hover(cardLink)

    await waitFor(() => {
      expect(screen.getByTestId('skelanim-preview')).toHaveTextContent('布鲁诺本体立绘')
    })

    await user.unhover(cardLink)

    expect(screen.queryByTestId('skelanim-preview')).not.toBeInTheDocument()
  })
})
