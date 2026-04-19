import { render } from '@testing-library/react'
import { createElement, Fragment } from 'react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
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
  function ChampionsPageRoute() {
    const location = useLocation()

    return createElement(
      Fragment,
      null,
      createElement(ChampionsPage),
      createElement('output', { 'data-testid': 'location-search' }, location.search),
    )
  }

  const router = createMemoryRouter(
    [
      {
        path: '/champions',
        element: createElement(ChampionsPageRoute),
      },
    ],
    { initialEntries },
  )

  return {
    router,
    ...render(
      <I18nProvider>
        <RouterProvider router={router} />
      </I18nProvider>,
    ),
  }
}
