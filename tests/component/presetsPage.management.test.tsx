import 'fake-indexeddb/auto'

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../../src/data/client', () => ({
  loadCollection: vi.fn(),
  loadCollectionAtVersion: vi.fn(),
  loadVersion: vi.fn(),
}))

import { I18nProvider } from '../../src/app/i18n'
import { listFormationPresets, saveFormationPreset } from '../../src/data/formationPresetStore'
import { APP_DATABASE_NAME } from '../../src/data/localDatabase'
import { loadCollection, loadCollectionAtVersion, loadVersion } from '../../src/data/client'
import { PresetsPage } from '../../src/pages/PresetsPage'
import type { Champion, DataCollection, DataVersion, FormationLayout } from '../../src/domain/types'

const versionFixture: DataVersion = {
  current: 'v1',
  updatedAt: '2026-04-23',
  notes: [],
}

const formationsFixture: DataCollection<FormationLayout> = {
  updatedAt: '2026-04-23',
  items: [
    {
      id: 'layout-a',
      name: {
        original: 'Layout A',
        display: '布局 A',
      },
      slots: [{ id: 'slot-1', row: 1, column: 1 }],
    },
  ],
}

const championsFixture: DataCollection<Champion> = {
  updatedAt: '2026-04-23',
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

function renderPresetsPage() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/presets']}>
        <Routes>
          <Route path="/presets" element={<PresetsPage />} />
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

describe('PresetsPage management flow', () => {
  it('可以编辑方案名称、备注、标签和优先级，并刷新列表展示', async () => {
    await saveFormationPreset({
      id: 'preset-a',
      schemaVersion: 1,
      dataVersion: 'v1',
      name: '方案 Alpha',
      description: '旧备注',
      layoutId: 'layout-a',
      placements: {
        'slot-1': 'bruenor',
      },
      scenarioRef: null,
      scenarioTags: ['推图'],
      priority: 'medium',
      createdAt: '2026-04-23T08:00:00.000Z',
      updatedAt: '2026-04-23T09:00:00.000Z',
    })

    const user = userEvent.setup()

    renderPresetsPage()

    expect(await screen.findByText('方案 Alpha')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '编辑' }))
    await user.clear(screen.getByRole('textbox', { name: '方案名称' }))
    await user.type(screen.getByRole('textbox', { name: '方案名称' }), '方案 Beta')
    await user.clear(screen.getByRole('textbox', { name: '方案备注' }))
    await user.type(screen.getByRole('textbox', { name: '方案备注' }), '新的备注')
    await user.clear(screen.getByRole('textbox', { name: '场景标签' }))
    await user.type(screen.getByRole('textbox', { name: '场景标签' }), '挂机, 试炼')
    await user.click(screen.getByRole('button', { name: '高优先' }))
    await user.click(screen.getByRole('button', { name: '保存修改' }))

    expect(await screen.findByText('方案“方案 Beta”已更新')).toBeInTheDocument()
    expect(screen.getByText('方案 Beta')).toBeInTheDocument()
    expect(screen.getByText('新的备注')).toBeInTheDocument()
    expect(screen.getByText('挂机')).toBeInTheDocument()
    expect(screen.getByText('试炼')).toBeInTheDocument()

    await waitFor(async () => {
      await expect(listFormationPresets()).resolves.toEqual([
        expect.objectContaining({
          name: '方案 Beta',
          description: '新的备注',
          scenarioTags: ['挂机', '试炼'],
          priority: 'high',
        }),
      ])
    })
  })

  it('可以删除方案，并在删除当前编辑项时一起关闭编辑态', async () => {
    await saveFormationPreset({
      id: 'preset-a',
      schemaVersion: 1,
      dataVersion: 'v1',
      name: '方案 Alpha',
      description: '待删除',
      layoutId: 'layout-a',
      placements: {
        'slot-1': 'bruenor',
      },
      scenarioRef: null,
      scenarioTags: ['推图'],
      priority: 'medium',
      createdAt: '2026-04-23T08:00:00.000Z',
      updatedAt: '2026-04-23T09:00:00.000Z',
    })

    const user = userEvent.setup()

    renderPresetsPage()

    expect(await screen.findByText('方案 Alpha')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '编辑' }))
    expect(screen.getByRole('textbox', { name: '方案名称' })).toHaveValue('方案 Alpha')

    const buttonRow = screen.getByRole('button', { name: '删除' }).closest('.button-row')

    if (!(buttonRow instanceof HTMLElement)) {
      throw new Error('删除按钮行不存在。')
    }

    await user.click(within(buttonRow).getByRole('button', { name: '删除' }))
    await user.click(within(buttonRow).getByRole('button', { name: '确认删除' }))

    expect(await screen.findByText('方案“方案 Alpha”已删除')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: '方案名称' })).not.toBeInTheDocument()
    expect(screen.getByText('这里还没有命名方案。先去阵型页摆出一套阵容，再点击“保存为方案”。')).toBeInTheDocument()

    await waitFor(async () => {
      await expect(listFormationPresets()).resolves.toEqual([])
    })
  })
})
