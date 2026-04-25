import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
    loadCollection: vi.fn(),
  }
})

import { I18nProvider } from '../../src/app/i18n'
import { loadCollection } from '../../src/data/client'
import { ChampionsPage } from '../../src/pages/ChampionsPage'

const mockedLoadCollection = vi.mocked(loadCollection)

afterEach(() => {
  mockedLoadCollection.mockReset()
})

describe('ChampionsPage avatars', () => {
  it('渲染官方头像资源并带上版本化路径', async () => {
    mockedLoadCollection.mockImplementation(async (name) => {
      if (name === 'champions') {
        return {
          updatedAt: '2026-04-13',
          items: [
            {
              id: '1',
              name: {
                original: 'Bruenor',
                display: '布鲁诺',
              },
              seat: 1,
              roles: ['support'],
              affiliations: [],
              tags: ['support'],
              portrait: {
                path: 'v1/champion-portraits/1.png',
                sourceGraphic: 'Portraits/Portrait_Bruenor',
                sourceVersion: 7,
              },
            },
          ],
        }
      }

      if (name === 'enums') {
        return {
          updatedAt: '2026-04-13',
          items: [
            { id: 'roles', values: ['support'] },
            { id: 'affiliations', values: [] },
          ],
        }
      }

      throw new Error(`unexpected collection: ${name}`)
    })

    const { container } = render(
      <I18nProvider>
        <MemoryRouter>
          <ChampionsPage />
        </MemoryRouter>
      </I18nProvider>,
    )

    const avatar = await screen.findByRole('img', { name: '布鲁诺头像' })
    const seatChip = container.querySelector('.tag-pill--seat')

    expect(avatar).toHaveAttribute('src', '/data/v1/champion-portraits/1.png')
    expect(seatChip).toHaveTextContent('1位')
    expect(screen.getByText('布鲁诺')).toBeInTheDocument()
  })
})
