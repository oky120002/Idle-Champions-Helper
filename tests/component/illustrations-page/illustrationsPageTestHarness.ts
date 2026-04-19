import { render } from '@testing-library/react'
import { createElement, Fragment } from 'react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import { I18nProvider } from '../../../src/app/i18n'
import { loadCollection } from '../../../src/data/client'
import { IllustrationsPage } from '../../../src/pages/IllustrationsPage'
import {
  animationFixture,
  championsFixture,
  enumsFixture,
  illustrationFixture,
  type IllustrationsPageCollectionOverrides,
} from './illustrationsPageTestData'

export const mockedLoadCollection = vi.mocked(loadCollection)
export const writeClipboardText = vi.fn<(_: string) => Promise<void>>()

export function installClipboardMock() {
  writeClipboardText.mockReset()
  writeClipboardText.mockResolvedValue(undefined)
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: writeClipboardText,
    },
  })
}

export function mockIllustrationsPageCollections(overrides: IllustrationsPageCollectionOverrides = {}) {
  const {
    illustrations = illustrationFixture,
    animations = animationFixture,
    champions = championsFixture,
    enums = enumsFixture,
  } = overrides

  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'champion-illustrations') {
      return illustrations
    }

    if (name === 'champions') {
      return champions
    }

    if (name === 'champion-animations') {
      return animations
    }

    if (name === 'enums') {
      return enums
    }

    throw new Error(`unexpected collection: ${name}`)
  })
}

export function renderIllustrationsPage(initialEntries: string[] = ['/illustrations']) {
  function IllustrationsPageRoute() {
    const location = useLocation()

    return createElement(
      Fragment,
      null,
      createElement(IllustrationsPage),
      createElement('output', { 'data-testid': 'location-search' }, location.search),
    )
  }

  const router = createMemoryRouter(
    [
      {
        path: '/illustrations',
        element: createElement(IllustrationsPageRoute),
      },
    ],
    { initialEntries },
  )

  return {
    router,
    ...render(
      createElement(
        I18nProvider,
        null,
        createElement(RouterProvider, { router }),
      ),
    ),
  }
}
