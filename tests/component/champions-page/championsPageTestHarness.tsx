import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { I18nProvider } from '../../../src/app/i18n'
import { loadCollection } from '../../../src/data/client'
import { ChampionsPage } from '../../../src/pages/ChampionsPage'
import { championsFixture, enumsFixture, type ChampionsPageCollectionOverrides } from './championsPageTestData'

export const mockedLoadCollection = vi.mocked(loadCollection)

export function mockChampionsPageCollections(overrides: ChampionsPageCollectionOverrides = {}) {
  const {
    champions = championsFixture,
    enums = enumsFixture,
    championVisuals = null,
  } = overrides

  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'champions') {
      return champions
    }

    if (name === 'enums') {
      return enums
    }

    if (name === 'champion-visuals' && championVisuals) {
      return championVisuals
    }

    throw new Error(`unexpected collection: ${name}`)
  })
}

export function renderChampionsPage(initialEntries: string[] = ['/champions']) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <ChampionsPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}
