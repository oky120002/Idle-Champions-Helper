import 'fake-indexeddb/auto'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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

import { listFormationPresets } from '../../data/formationPresetStore'
import { unwrap } from '../../../tests/utils/dom-assertions'
import { I18nProvider } from '../../app/i18n'
import { FormationPage } from '../FormationPage'
import type { Champion, DataCollection, DataVersion, FormationLayout, FormationPreset } from '../../domain/types'
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
  await user.click(unwrap(screen.getAllByTestId('hero-picker-trigger')[0], 'hero-picker-trigger'))
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

describe('FormationPage save preset with filter snapshot', () => {
  it('有筛选时保存方案写入 filterSnapshot', async () => {
    const user = userEvent.setup()
    renderFormationPage('/formation?seat=1')

    // 等页面 ready 后选一个英雄放入槽位
    const [select] = await screen.findAllByRole('combobox')
    await user.selectOptions(unwrap(select, 'combobox'), 'bruenor')
    await user.type(screen.getByLabelText('方案名称'), '测试方案')
    await user.click(screen.getByRole('button', { name: '保存为方案' }))

    await waitFor(async () => {
      await expect(listFormationPresets()).resolves.toHaveLength(1)
    })

    const presets = await listFormationPresets()
    expect(presets[0]?.filterSnapshot).toEqual({
      search: '',
      selectedSeats: [1],
      selectedRoles: [],
      selectedAffiliations: [],
      selectedRaces: [],
      selectedGenders: [],
      selectedAlignments: [],
      selectedProfessions: [],
      selectedAcquisitions: [],
      selectedMechanics: [],
      selectedPatrons: [],
    })
  })

  it('无筛选时保存方案 filterSnapshot 为 null', async () => {
    const user = userEvent.setup()
    renderFormationPage('/formation')

    const [select] = await screen.findAllByRole('combobox')
    await user.selectOptions(unwrap(select, 'combobox'), 'bruenor')
    await user.type(screen.getByLabelText('方案名称'), '无筛选方案')
    await user.click(screen.getByRole('button', { name: '保存为方案' }))

    await waitFor(async () => {
      await expect(listFormationPresets()).resolves.toHaveLength(1)
    })

    const presets = await listFormationPresets()
    expect(presets[0]?.filterSnapshot).toBeNull()
  })
})

describe('FormationPage restore preset with filter snapshot', () => {
  function renderWithPresetRestore(preset: FormationPreset) {
    return render(
      <I18nProvider>
        <MemoryRouter initialEntries={[{ pathname: '/formation', state: { pendingPresetRestore: preset } }]}>
          <FormationPage />
        </MemoryRouter>
      </I18nProvider>,
    )
  }

  const presetWithSeatOne: FormationPreset = {
    id: 'preset-filtered',
    schemaVersion: 1,
    dataVersion: 'v1',
    name: '筛选方案',
    description: '',
    layoutId: 'layout-a',
    placements: { 'slot-1': 'bruenor' },
    scenarioRef: null,
    scenarioTags: [],
    priority: 'medium',
    filterSnapshot: {
      search: '',
      selectedSeats: [1],
      selectedRoles: [],
      selectedAffiliations: [],
      selectedRaces: [],
      selectedGenders: [],
      selectedAlignments: [],
      selectedProfessions: [],
      selectedAcquisitions: [],
      selectedMechanics: [],
      selectedPatrons: [],
    },
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
  }

  it('恢复含 filterSnapshot 的方案时 HeroPicker 按快照过滤候选', async () => {
    const user = userEvent.setup()
    renderWithPresetRestore(presetWithSeatOne)

    await openHeroPicker(user)

    // seat=1 快照 → 只有 Bruenor(seat 1)，Celeste(seat 2) 被过滤掉
    expect(screen.getAllByText('布鲁诺').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('赛丽丝特')).toHaveLength(0)
  })

  it('恢复 filterSnapshot=null 的旧方案时候选池为全量', async () => {
    const user = userEvent.setup()
    renderWithPresetRestore({ ...presetWithSeatOne, filterSnapshot: null })

    await openHeroPicker(user)

    expect(screen.getAllByText('布鲁诺').length).toBeGreaterThan(0)
    expect(screen.getAllByText('赛丽丝特').length).toBeGreaterThan(0)
  })

  it('已放置英雄即使不匹配筛选也在槽位下拉中可见', async () => {
    // 方案筛选 seat=1，但 slot-2 放了 Celeste(seat 2)——下拉必须显示当前英雄
    renderWithPresetRestore({
      ...presetWithSeatOne,
      placements: { 'slot-1': 'bruenor', 'slot-2': 'celeste' },
    })

    // 等 bootstrap 恢复方案完成（恢复状态消息出现）
    await waitFor(() => {
      expect(screen.getByText(/已从方案/)).toBeInTheDocument()
    })

    const selects = screen.getAllByRole('combobox')
    const slot2Select = unwrap(selects[1], 'slot-2 select')
    const slot2Options = Array.from(slot2Select.querySelectorAll('option')).map((o) => o.value)
    expect(slot2Options).toContain('celeste')
    expect(slot2Select.value).toBe('celeste')
  })
})
