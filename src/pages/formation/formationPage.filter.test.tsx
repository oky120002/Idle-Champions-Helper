import 'fake-indexeddb/auto'

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../data/client', async () => {
  const actual = await vi.importActual<typeof import('../../data/client')>('../../data/client')
  return {
    ...actual,
    loadCollection: vi.fn(),
    loadCollectionAtVersion: vi.fn(),
    loadVersion: vi.fn(),
  }
})

import type { Champion, DataCollection, DataVersion, FormationLayout } from '../../domain/types'
import {
  mockFormationPageCollections,
  mockedLoadCollection,
  mockedLoadCollectionAtVersion,
  mockedLoadVersion,
  renderFormationPage,
  resetFormationPageDatabase,
} from './formationPageTestHarness'

const versionFixture: DataVersion = {
  current: 'v1',
  updatedAt: '2026-04-13',
  notes: [],
}

const formationsFixture: DataCollection<FormationLayout> = {
  updatedAt: '2026-04-13',
  items: [
    {
      id: 'layout-a',
      name: { original: 'Layout A', display: '布局 A' },
      slots: [
        { id: 'slot-1', row: 1, column: 1 },
        { id: 'slot-2', row: 1, column: 2 },
      ],
    },
  ],
}

const championsFixture: DataCollection<Champion> = {
  updatedAt: '2026-04-13',
  items: [
    {
      id: 'bruenor',
      name: { original: 'Bruenor', display: '布鲁诺' },
      seat: 1,
      roles: ['support'],
      affiliations: [],
      tags: ['dwarf'],
      portrait: { path: 'v1/champion-portraits/bruenor.png', sourceGraphic: 'Portraits/Portrait_Bruenor', sourceVersion: 7 },
    },
    {
      id: 'celeste',
      name: { original: 'Celeste', display: '赛丽丝特' },
      seat: 2,
      roles: ['healing'],
      affiliations: [],
      tags: ['dwarf'],
      portrait: { path: 'v1/champion-portraits/celeste.png', sourceGraphic: 'Portraits/Portrait_Celeste', sourceVersion: 7 },
    },
  ],
}

async function openHeroPicker(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(screen.getAllByTestId('hero-picker-trigger').length).toBeGreaterThan(0))
  await user.click(screen.getAllByTestId('hero-picker-trigger')[0])
  await waitFor(() => expect(screen.getAllByTestId('hero-picker-panel').length).toBeGreaterThan(0))
}

beforeEach(async () => {
  await resetFormationPageDatabase()
  mockFormationPageCollections({ version: versionFixture, formations: formationsFixture, champions: championsFixture })
})

afterEach(async () => {
  mockedLoadCollection.mockReset()
  mockedLoadCollectionAtVersion.mockReset()
  mockedLoadVersion.mockReset()
  await resetFormationPageDatabase()
})

describe('FormationPage filter via URL', () => {
  it('无筛选参数时 HeroPicker 显示全部英雄', async () => {
    const user = userEvent.setup()
    renderFormationPage('/formation')

    await openHeroPicker(user)

    expect(screen.getAllByText('布鲁诺').length).toBeGreaterThan(0)
    expect(screen.getAllByText('赛丽丝特').length).toBeGreaterThan(0)
  })

  it('seat 筛选参数只显示匹配席位的英雄', async () => {
    const user = userEvent.setup()
    renderFormationPage('/formation?seat=1')

    await openHeroPicker(user)

    expect(screen.getAllByText('布鲁诺').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('赛丽丝特')).toHaveLength(0)
  })

  it('race 筛选参数命中 tags', async () => {
    const user = userEvent.setup()
    renderFormationPage('/formation?race=dwarf')

    await openHeroPicker(user)

    // 两个英雄都有 dwarf tag
    expect(screen.getAllByText('布鲁诺').length).toBeGreaterThan(0)
    expect(screen.getAllByText('赛丽丝特').length).toBeGreaterThan(0)
  })

  it('组合筛选 seat=2+race=dwarf 只剩 Celeste', async () => {
    const user = userEvent.setup()
    renderFormationPage('/formation?seat=2&race=dwarf')

    await openHeroPicker(user)

    expect(screen.queryAllByText('布鲁诺')).toHaveLength(0)
    expect(screen.getAllByText('赛丽丝特').length).toBeGreaterThan(0)
  })
})
