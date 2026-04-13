import 'fake-indexeddb/auto'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../../src/data/client', () => ({
  loadCollection: vi.fn(),
  loadCollectionAtVersion: vi.fn(),
  loadVersion: vi.fn(),
}))

import { I18nProvider } from '../../src/app/i18n'
import { readRecentFormationDraft } from '../../src/data/formationDraftStore'
import { saveFormationPreset } from '../../src/data/formationPresetStore'
import { APP_DATABASE_NAME } from '../../src/data/localDatabase'
import { loadCollection, loadCollectionAtVersion, loadVersion } from '../../src/data/client'
import { FormationPage } from '../../src/pages/FormationPage'
import { PresetsPage } from '../../src/pages/PresetsPage'
import type { Champion, DataCollection, DataVersion, FormationLayout } from '../../src/domain/types'

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
      name: '布局 A',
      slots: [{ id: 'slot-1', row: 1, column: 1 }],
    },
  ],
}

const championsFixture: DataCollection<Champion> = {
  updatedAt: '2026-04-13',
  items: [
    {
      id: 'bruenor',
      name: {
        original: 'Bruenor',
        display: '布鲁诺',
      },
      seat: 1,
      roles: ['support'],
      affiliations: [],
      tags: [],
    },
  ],
}

const mockedLoadCollection = vi.mocked(loadCollection)
const mockedLoadCollectionAtVersion = vi.mocked(loadCollectionAtVersion)
const mockedLoadVersion = vi.mocked(loadVersion)

async function resetDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)

    request.onerror = () => {
      reject(request.error ?? new Error('删除测试数据库失败。'))
    }

    request.onblocked = () => {
      reject(new Error('删除测试数据库被阻塞。'))
    }

    request.onsuccess = () => {
      resolve()
    }
  })
}

function mockDataLayer() {
  mockedLoadVersion.mockResolvedValue(versionFixture)
  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'formations') {
      return formationsFixture
    }

    if (name === 'champions') {
      return championsFixture
    }

    throw new Error(`unexpected collection: ${name}`)
  })
  mockedLoadCollectionAtVersion.mockImplementation(async (version, name) => {
    if (version === 'v1' && name === 'formations') {
      return formationsFixture
    }

    if (version === 'v1' && name === 'champions') {
      return championsFixture
    }

    throw new Error(`unexpected collection at version: ${version}/${name}`)
  })
}

function renderPresetFlow() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/presets']}>
        <Routes>
          <Route path="/presets" element={<PresetsPage />} />
          <Route path="/formation" element={<FormationPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  )
}

beforeEach(async () => {
  await resetDatabase()
  mockDataLayer()
})

afterEach(async () => {
  mockedLoadCollection.mockReset()
  mockedLoadCollectionAtVersion.mockReset()
  mockedLoadVersion.mockReset()
  await resetDatabase()
})

describe('PresetsPage restore flow', () => {
  it('可以从方案页恢复方案回阵型页，并回写最近草稿', async () => {
    await saveFormationPreset({
      id: 'preset-a',
      schemaVersion: 1,
      dataVersion: 'v1',
      name: '方案 Alpha',
      description: '给恢复流程做回归覆盖',
      layoutId: 'layout-a',
      placements: {
        'slot-1': 'bruenor',
      },
      scenarioRef: null,
      scenarioTags: ['推图'],
      priority: 'high',
      createdAt: '2026-04-13T08:00:00.000Z',
      updatedAt: '2026-04-13T09:00:00.000Z',
    })

    const user = userEvent.setup()

    renderPresetFlow()

    expect(await screen.findByText('方案 Alpha')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '恢复到阵型页' }))

    expect(await screen.findByText('已从方案“方案 Alpha”恢复到阵型页')).toBeInTheDocument()
    expect(screen.getByText('布鲁诺')).toBeInTheDocument()

    await waitFor(async () => {
      await expect(readRecentFormationDraft()).resolves.toMatchObject({
        layoutId: 'layout-a',
        placements: {
          'slot-1': 'bruenor',
        },
      })
    })
  })
})
