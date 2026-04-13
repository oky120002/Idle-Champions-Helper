import 'fake-indexeddb/auto'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../src/data/client', () => ({
  loadCollection: vi.fn(),
  loadCollectionAtVersion: vi.fn(),
  loadVersion: vi.fn(),
}))

import { I18nProvider } from '../../src/app/i18n'
import { FormationPage } from '../../src/pages/FormationPage'
import { readRecentFormationDraft } from '../../src/data/formationDraftStore'
import { listFormationPresets } from '../../src/data/formationPresetStore'
import { APP_DATABASE_NAME } from '../../src/data/localDatabase'
import { loadCollection, loadCollectionAtVersion, loadVersion } from '../../src/data/client'
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
      name: {
        original: 'Bruenor',
        display: '布鲁诺',
      },
      seat: 1,
      roles: ['support'],
      affiliations: [],
      tags: [],
    },
    {
      id: 'celeste',
      name: {
        original: 'Celeste',
        display: '赛丽丝特',
      },
      seat: 2,
      roles: ['healing'],
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

function renderFormationPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <FormationPage />
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
  vi.useRealTimers()
  await resetDatabase()
})

describe('FormationPage persistence flow', () => {
  it('检测到最近草稿后可以恢复到页面', async () => {
    const { saveRecentFormationDraft } = await import('../../src/data/formationDraftStore')

    await saveRecentFormationDraft({
      schemaVersion: 1,
      dataVersion: 'v1',
      layoutId: 'layout-a',
      scenarioRef: null,
      placements: {
        'slot-1': 'bruenor',
      },
      updatedAt: '2026-04-13T10:00:00.000Z',
    })

    const user = userEvent.setup()

    renderFormationPage()

    expect(await screen.findByText('检测到最近草稿，是否恢复？')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '恢复最近草稿' }))

    expect(await screen.findByText('最近草稿已恢复')).toBeInTheDocument()
    expect(screen.getByText('布鲁诺')).toBeInTheDocument()
  })

  it('编辑阵型后会自动保存最近草稿到 IndexedDB', async () => {
    const user = userEvent.setup()

    renderFormationPage()

    const [select] = await screen.findAllByRole('combobox')

    await user.selectOptions(select, 'bruenor')

    await waitFor(async () => {
      await expect(readRecentFormationDraft()).resolves.toMatchObject({
        dataVersion: 'v1',
        layoutId: 'layout-a',
        placements: {
          'slot-1': 'bruenor',
        },
      })
    }, { timeout: 2000 })

    expect(await screen.findByText('最近草稿已自动保存')).toBeInTheDocument()
  })

  it('可以把当前阵型保存为命名方案', async () => {
    const user = userEvent.setup()

    renderFormationPage()

    const [select] = await screen.findAllByRole('combobox')
    await user.selectOptions(select, 'bruenor')
    await user.type(screen.getByLabelText('方案名称'), '推图常用队')
    await user.type(screen.getByLabelText('方案备注'), '先拿来做组件测试')
    await user.click(screen.getByRole('button', { name: '保存为方案' }))

    await waitFor(async () => {
      await expect(listFormationPresets()).resolves.toHaveLength(1)
    })

    const presets = await listFormationPresets()

    expect(presets[0]).toMatchObject({
      name: '推图常用队',
      description: '先拿来做组件测试',
      layoutId: 'layout-a',
      dataVersion: 'v1',
      placements: {
        'slot-1': 'bruenor',
      },
    })

    expect(screen.getByText('方案“推图常用队”已保存')).toBeInTheDocument()
  })
})
