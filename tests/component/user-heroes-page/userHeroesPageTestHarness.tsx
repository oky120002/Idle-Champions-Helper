import { render } from '@testing-library/react'
import { createElement, Fragment } from 'react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import { I18nProvider } from '../../../src/app/i18n'
import { loadChampionDetail, loadCollection, loadVersion } from '../../../src/data/client'
import { resolveUserProfileSnapshot, type UserProfileResolution } from '../../../src/data/user-profile-store'
import type { ChampionDetail, DataVersion } from '../../../src/domain/types'
import { createUserProfileSnapshot } from '../../../src/domain/user-profile/fixtures'
import type { OwnedHero } from '../../../src/domain/user-profile/types'
import { UserHeroesPage } from '../../../src/pages/UserHeroesPage'
import { championsFixture, enumsFixture, type ChampionsPageCollectionOverrides } from '../champions-page/championsPageTestData'

vi.mock('../../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../../src/data/client')>('../../../src/data/client')

  return {
    ...actual,
    loadCollection: vi.fn(),
    loadVersion: vi.fn(),
    loadChampionDetail: vi.fn(),
  }
})

vi.mock('../../../src/data/user-profile-store', async () => {
  const actual =
    await vi.importActual<typeof import('../../../src/data/user-profile-store')>('../../../src/data/user-profile-store')

  return {
    ...actual,
    resolveUserProfileSnapshot: vi.fn(),
  }
})

export const mockedLoadCollection = vi.mocked(loadCollection)
export const mockedLoadVersion = vi.mocked(loadVersion)
export const mockedLoadChampionDetail = vi.mocked(loadChampionDetail)
export const mockedResolveUserProfileSnapshot = vi.mocked(resolveUserProfileSnapshot)

const defaultVersion: DataVersion = {
  current: 'v1',
  updatedAt: '2026-04-18',
  notes: [],
}

export function mockUserHeroesPageCollections(overrides: ChampionsPageCollectionOverrides = {}) {
  const {
    champions = championsFixture,
    enums = enumsFixture,
    championVisuals = { updatedAt: '', items: [] },
    championIllustrations = { updatedAt: '', items: [] },
  } = overrides

  mockedLoadVersion.mockResolvedValue(defaultVersion)
  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'champions') {
      return champions
    }

    if (name === 'enums') {
      return enums
    }

    if (name === 'champion-visuals') {
      return championVisuals
    }

    if (name === 'champion-illustrations') {
      return championIllustrations
    }

    throw new Error(`unexpected collection: ${name}`)
  })
}

export function mockUserHeroesProfile({
  ownedHeroes = [],
  resolvedSource = 'browser-sync',
  selectedSource = resolvedSource ?? 'browser-sync',
  legendaryLevelCap = 20,
  errorMessage = null,
}: {
  ownedHeroes?: OwnedHero[]
  resolvedSource?: UserProfileResolution['resolvedSource']
  selectedSource?: UserProfileResolution['selectedSource']
  legendaryLevelCap?: number
  errorMessage?: string | null
} = {}) {
  mockedResolveUserProfileSnapshot.mockResolvedValue({
    selectedSource,
    resolvedSource,
    snapshot: resolvedSource
      ? createUserProfileSnapshot({
          ownedHeroes,
          legendaryLevelCap,
        })
      : null,
    errorMessage,
    persisted: resolvedSource === 'browser-sync',
  })
}

export function mockUserHeroesChampionDetails(detailsByChampionId: Record<string, ChampionDetail>) {
  mockedLoadChampionDetail.mockImplementation(async (championId) => {
    const detail = detailsByChampionId[championId]

    if (!detail) {
      throw new Error(`unexpected champion detail: ${championId}`)
    }

    return detail
  })
}

export function renderUserHeroesPage(initialEntries: string[] = ['/user-heroes']) {
  function UserHeroesPageRoute() {
    const location = useLocation()

    return createElement(
      Fragment,
      null,
      createElement(UserHeroesPage),
      createElement('output', { 'data-testid': 'location-search' }, location.search),
    )
  }

  const router = createMemoryRouter(
    [
      {
        path: '/user-heroes',
        element: createElement(UserHeroesPageRoute),
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
