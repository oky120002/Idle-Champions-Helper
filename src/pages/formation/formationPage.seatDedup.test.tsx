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
import { unwrap } from '../../../tests/utils/dom-assertions'
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

function portrait(id: string) {
  return {
    path: `v1/champion-portraits/${id}.png`,
    sourceGraphic: `Portraits/Portrait_${id}`,
    sourceVersion: 7,
  }
}

function champion(id: string, seat: number, roles: string[] = []): Champion {
  return {
    id,
    seat,
    roles,
    name: { original: id, display: id },
    affiliations: [],
    tags: [],
    portrait: portrait(id),
  }
}

const championsFixture: DataCollection<Champion> = {
  updatedAt: '2026-04-13',
  items: [
    champion('bruenor', 1),
    champion('asharra', 1),
    champion('celeste', 2),
    champion('nayeli', 3),
  ],
}

function optionValues(select: HTMLElement): string[] {
  return Array.from(select.querySelectorAll('option')).map((option) => option.value)
}

beforeEach(async () => {
  await resetFormationPageDatabase()
  mockFormationPageCollections({
    version: versionFixture,
    formations: formationsFixture,
    champions: championsFixture,
  })
})

afterEach(async () => {
  mockedLoadCollection.mockReset()
  mockedLoadCollectionAtVersion.mockReset()
  mockedLoadVersion.mockReset()
  vi.useRealTimers()
  await resetFormationPageDatabase()
})

describe('formation slot seat dedup', () => {
  it('某槽位选英雄后，其他槽位下拉去掉同号位英雄', async () => {
    const user = userEvent.setup()
    renderFormationPage()

    const selects = await screen.findAllByRole('combobox')
    const select0 = unwrap(selects[0], 'expected first combobox')
    const select1 = unwrap(selects[1], 'expected second combobox')
    await user.selectOptions(select0, 'bruenor')

    await waitFor(() => {
      const slot2 = optionValues(select1)
      expect(slot2).not.toContain('asharra')
      expect(slot2).toContain('celeste')
      expect(slot2).toContain('nayeli')
    })
  })

  it('本槽位保留自己的英雄选项', async () => {
    const user = userEvent.setup()
    renderFormationPage()

    const selects = await screen.findAllByRole('combobox')
    const select0 = unwrap(selects[0], 'expected first combobox')
    await user.selectOptions(select0, 'bruenor')

    await waitFor(() => {
      const slot1 = optionValues(select0)
      expect(slot1).toContain('bruenor')
    })
  })

  it('清空槽位后，该号位英雄加回其他槽位', async () => {
    const user = userEvent.setup()
    renderFormationPage()

    const selects = await screen.findAllByRole('combobox')
    const select0 = unwrap(selects[0], 'expected first combobox')
    const select1 = unwrap(selects[1], 'expected second combobox')
    await user.selectOptions(select0, 'bruenor')

    await waitFor(() => {
      expect(optionValues(select1)).not.toContain('asharra')
    })

    await user.selectOptions(select0, '')

    await waitFor(() => {
      expect(optionValues(select1)).toContain('asharra')
    })
  })
})
