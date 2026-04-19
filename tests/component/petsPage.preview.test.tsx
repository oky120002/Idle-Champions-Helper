import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
    loadCollection: vi.fn(),
    loadVersion: vi.fn(),
  }
})

vi.mock('../../src/features/skelanim-player/SkelAnimCanvas', () => ({
  SkelAnimCanvas: ({ alt }: { alt: string }) => <div data-testid="skelanim-preview">{alt}</div>,
}))

import { render } from '@testing-library/react'
import { I18nProvider } from '../../src/app/i18n'
import { loadCollection, loadVersion } from '../../src/data/client'
import type { DataCollection, Pet, PetAnimation } from '../../src/domain/types'
import { PetsPage } from '../../src/pages/PetsPage'

const mockedLoadCollection = vi.mocked(loadCollection)
const mockedLoadVersion = vi.mocked(loadVersion)

const petsFixture: DataCollection<Pet> = {
  updatedAt: '2026-04-18T00:00:00.000Z',
  items: [
    {
      id: '1',
      name: { original: 'Mage Hand', display: '法师之手' },
      description: { original: 'Animated helper.', display: '一只带动图预览的测试宠物。' },
      isAvailable: true,
      iconGraphicId: '2638',
      illustrationGraphicId: '13666',
      acquisition: {
        kind: 'gems',
        sourceType: 'shop',
        gemCost: 1000,
        premiumPackName: null,
        premiumPackDescription: null,
        patronName: null,
        patronCurrency: null,
        patronCost: null,
        patronInfluence: null,
      },
      icon: { path: 'v1/pets/icons/1.png', width: 72, height: 72, bytes: 1024, format: 'png' },
      illustration: { path: 'v1/pets/illustrations/1.png', width: 128, height: 128, bytes: 4096, format: 'png' },
    },
  ],
}

const petAnimationsFixture: DataCollection<PetAnimation> = {
  updatedAt: '2026-04-18T00:00:00.000Z',
  items: [
    {
      id: '1',
      petId: '1',
      name: { original: 'Mage Hand', display: '法师之手' },
      sourceSlot: 'illustration',
      sourceGraphicId: '13666',
      sourceGraphic: 'Familiars/Familiar_MageHand_4xup',
      sourceVersion: 1,
      fps: 24,
      defaultSequenceIndex: 0,
      defaultFrameIndex: 0,
      asset: {
        path: 'v1/pet-animations/illustrations/1.bin',
        bytes: 2048,
        format: 'skelanim-zlib',
      },
      sequences: [
        {
          sequenceIndex: 0,
          frameCount: 10,
          pieceCount: 8,
          firstRenderableFrameIndex: 0,
          bounds: { minX: 0, minY: 0, maxX: 120, maxY: 120 },
        },
      ],
    },
  ],
}

function renderPetsPage() {
  return render(
    <I18nProvider>
      <PetsPage />
    </I18nProvider>,
  )
}

describe('PetsPage hover preview', () => {
  beforeEach(() => {
    mockedLoadCollection.mockImplementation(async (name) => {
      if (name === 'pets') {
        return petsFixture
      }

      if (name === 'pet-animations') {
        return petAnimationsFixture
      }

      throw new Error(`unexpected collection: ${name}`)
    })
    mockedLoadVersion.mockResolvedValue({
      current: 'v1',
      updatedAt: '2026-04-18',
      notes: [],
    })
  })

  afterEach(() => {
    mockedLoadCollection.mockReset()
    mockedLoadVersion.mockReset()
    vi.restoreAllMocks()
  })

  it('鼠标悬停宠物卡片时会切到对应立绘的动态预览', async () => {
    const user = userEvent.setup()

    renderPetsPage()

    const petHeading = await screen.findByRole('heading', { level: 3, name: '法师之手' })

    await waitFor(() => {
      expect(mockedLoadCollection).toHaveBeenCalledWith('pet-animations')
    })

    expect(screen.queryByTestId('skelanim-preview')).not.toBeInTheDocument()

    await user.hover(petHeading.closest('article') as HTMLElement)

    await waitFor(() => {
      expect(screen.getByTestId('skelanim-preview')).toHaveTextContent('法师之手立绘')
    })

    await user.unhover(petHeading.closest('article') as HTMLElement)

    expect(screen.queryByTestId('skelanim-preview')).not.toBeInTheDocument()
  })
})
