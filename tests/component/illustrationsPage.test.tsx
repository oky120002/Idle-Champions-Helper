import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
    loadCollection: vi.fn(),
  }
})

import { I18nProvider } from '../../src/app/i18n'
import { loadCollection } from '../../src/data/client'
import { IllustrationsPage } from '../../src/pages/IllustrationsPage'
import type { ChampionIllustration, DataCollection } from '../../src/domain/types'

const mockedLoadCollection = vi.mocked(loadCollection)

const illustrationFixture: DataCollection<ChampionIllustration> = {
  updatedAt: '2026-04-15',
  items: [
    {
      id: 'hero:1',
      championId: '1',
      skinId: null,
      kind: 'hero-base',
      seat: 1,
      championName: {
        original: 'Bruenor',
        display: '布鲁诺',
      },
      illustrationName: {
        original: 'Bruenor',
        display: '布鲁诺',
      },
      portraitPath: 'v1/champion-portraits/1.png',
      sourceSlot: 'base',
      sourceGraphicId: '8',
      sourceGraphic: 'Characters/Hero_Bruenor',
      sourceVersion: 7,
      image: {
        path: 'v1/champion-illustrations/heroes/1.png',
        width: 1024,
        height: 1024,
        bytes: 65760,
        format: 'png',
      },
    },
    {
      id: 'skin:3001',
      championId: '1',
      skinId: '3001',
      kind: 'skin',
      seat: 1,
      championName: {
        original: 'Bruenor',
        display: '布鲁诺',
      },
      illustrationName: {
        original: 'Pirate Bruenor',
        display: '海盗布鲁诺',
      },
      portraitPath: 'v1/champion-portraits/1.png',
      sourceSlot: 'large',
      sourceGraphicId: '3004',
      sourceGraphic: 'Characters/Hero_BruenorPirate_2xup',
      sourceVersion: 3,
      image: {
        path: 'v1/champion-illustrations/skins/3001.png',
        width: 1024,
        height: 1024,
        bytes: 73640,
        format: 'png',
      },
    },
  ],
}

function renderIllustrationsPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <IllustrationsPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}

beforeEach(() => {
  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'champion-illustrations') {
      return illustrationFixture
    }

    throw new Error(`unexpected collection: ${name}`)
  })
})

afterEach(() => {
  mockedLoadCollection.mockReset()
})

describe('IllustrationsPage', () => {
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
})
