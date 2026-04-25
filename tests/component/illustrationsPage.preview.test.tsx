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

vi.mock('../../src/features/skelanim-player/SkelAnimCanvas', () => ({
  SkelAnimCanvas: ({
    alt,
    playbackMode,
    sequenceIntent,
    viewportBounds,
  }: {
    alt: string
    playbackMode?: 'manual' | 'play' | 'pause'
    sequenceIntent?: 'default' | 'walk'
    viewportBounds?: { minX: number; minY: number; maxX: number; maxY: number } | null
  }) => (
    <div
      data-testid="skelanim-preview"
      data-playback-mode={playbackMode ?? 'manual'}
      data-sequence-intent={sequenceIntent ?? 'default'}
      data-viewport-width={viewportBounds ? String(viewportBounds.maxX - viewportBounds.minX) : 'none'}
    >
      {alt}
    </div>
  ),
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

    const preview = () => within(cardLink).getByTestId('skelanim-preview')

    expect(within(cardLink).queryByTestId('skelanim-preview')).not.toBeInTheDocument()

    await user.hover(cardLink)

    await waitFor(() => {
      expect(preview()).toHaveTextContent('布鲁诺本体立绘')
      expect(preview()).toHaveAttribute('data-sequence-intent', 'walk')
      expect(preview()).toHaveAttribute('data-playback-mode', 'play')
      expect(preview()).toHaveAttribute('data-viewport-width', '452')
    })

    await user.unhover(cardLink)

    await waitFor(() => {
      expect(preview()).toHaveAttribute('data-playback-mode', 'pause')
    })
  })
})
