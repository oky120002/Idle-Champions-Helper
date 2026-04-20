import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/data/client', () => ({
  loadCollectionAtVersion: vi.fn(),
  loadVersion: vi.fn(),
}))

vi.mock('../../../src/data/formationDraftStore', () => ({
  readRecentFormationDraft: vi.fn(),
  saveRecentFormationDraft: vi.fn(),
}))

vi.mock('../../../src/data/formationPersistence', () => ({
  buildFormationSnapshotPrompt: vi.fn(),
  buildRestoreStatusDetail: vi.fn(),
}))

import { buildFormationSnapshotPrompt } from '../../../src/data/formationPersistence'
import { readRecentFormationDraft, saveRecentFormationDraft } from '../../../src/data/formationDraftStore'
import type { Champion, FormationLayout, FormationPreset } from '../../../src/domain/types'
import {
  loadStoredDraftPrompt,
  restorePendingPreset,
} from '../../../src/pages/formation/formation-bootstrap-operations'

const mockedBuildFormationSnapshotPrompt = vi.mocked(buildFormationSnapshotPrompt)
const mockedReadRecentFormationDraft = vi.mocked(readRecentFormationDraft)
const mockedSaveRecentFormationDraft = vi.mocked(saveRecentFormationDraft)

function createChampion(id: string, seat: number): Champion {
  return {
    id,
    name: {
      original: id,
      display: id,
    },
    seat,
    roles: [],
    affiliations: [],
    tags: [],
  }
}

function createLayout(id: string, slotIds: string[]): FormationLayout {
  return {
    id,
    name: {
      original: id,
      display: id,
    },
    slots: slotIds.map((slotId, index) => ({
      id: slotId,
      row: 1,
      column: index + 1,
    })),
  }
}

function createPreset(): FormationPreset {
  return {
    id: 'preset-a',
    name: '推图常用队',
    description: '',
    priority: 'medium',
    createdAt: '2026-04-19T00:00:00.000Z',
    schemaVersion: 1,
    dataVersion: 'v1',
    layoutId: 'layout-a',
    placements: {
      'slot-1': 'bruenor',
    },
    scenarioTags: [],
    scenarioRef: null,
    updatedAt: '2026-04-20T00:00:00.000Z',
  }
}

function createSetters() {
  return {
    setState: vi.fn(),
    setSelectedLayoutId: vi.fn(),
    setPlacements: vi.fn(),
    setScenarioRef: vi.fn(),
    setDraftPrompt: vi.fn(),
    setDraftStatus: vi.fn(),
    setIsDraftPersistenceArmed: vi.fn(),
    setActiveMobileSlotId: vi.fn(),
  }
}

describe('formation bootstrap operations', () => {
  it('方案恢复不可用时会直接给出错误状态并终止后续恢复', async () => {
    mockedBuildFormationSnapshotPrompt.mockResolvedValue({
      kind: 'invalid',
      snapshot: {
        schemaVersion: 1,
        dataVersion: 'v1',
        layoutId: 'layout-a',
        scenarioRef: null,
        placements: {},
        updatedAt: '2026-04-20T00:00:00.000Z',
      },
      title: 'ignored',
      detail: '布局引用已失效',
    })

    const setters = createSetters()
    const navigate = vi.fn()

    await restorePendingPreset({
      isDisposed: () => false,
      navigate,
      pendingPresetRestore: createPreset(),
      version: 'v1',
      formations: [createLayout('layout-a', ['slot-1'])],
      champions: [createChampion('bruenor', 1)],
      ...setters,
    })

    expect(navigate).toHaveBeenCalledWith('/formation', { replace: true, state: null })
    expect(setters.setIsDraftPersistenceArmed).toHaveBeenCalledWith(true)
    expect(setters.setDraftStatus).toHaveBeenCalledWith({
      tone: 'error',
      title: '方案“推图常用队”当前不能恢复',
      detail: '布局引用已失效',
    })
    expect(mockedSaveRecentFormationDraft).not.toHaveBeenCalled()
    expect(setters.setState).not.toHaveBeenCalled()
  })

  it('最近草稿回写失败时保留恢复结果并展示失败原因', async () => {
    const layout = createLayout('layout-a', ['slot-1'])
    const champion = createChampion('bruenor', 1)

    mockedBuildFormationSnapshotPrompt.mockResolvedValue({
      kind: 'restore',
      preview: {
        snapshot: {
          schemaVersion: 1,
          dataVersion: 'v1',
          layoutId: 'layout-a',
          scenarioRef: null,
          placements: {
            'slot-1': 'bruenor',
          },
          updatedAt: '2026-04-20T00:00:00.000Z',
        },
        layoutName: layout.name,
        dataVersion: 'v1',
        restoreMode: 'exact',
        formations: [layout],
        champions: [champion],
        placements: {
          'slot-1': 'bruenor',
        },
        invalidSlotIds: [],
        invalidChampionIds: [],
      },
    })
    mockedSaveRecentFormationDraft.mockRejectedValue(new Error('IndexedDB 写入失败'))

    const setters = createSetters()

    await restorePendingPreset({
      isDisposed: () => false,
      navigate: vi.fn(),
      pendingPresetRestore: createPreset(),
      version: 'v1',
      formations: [layout],
      champions: [champion],
      ...setters,
    })

    expect(setters.setState).toHaveBeenCalledWith({
      status: 'ready',
      dataVersion: 'v1',
      formations: [layout],
      champions: [champion],
    })
    expect(setters.setSelectedLayoutId).toHaveBeenCalledWith('layout-a')
    expect(setters.setPlacements).toHaveBeenCalledWith({
      'slot-1': 'bruenor',
    })
    expect(setters.setDraftPrompt).toHaveBeenCalledWith(null)
    expect(setters.setDraftStatus).toHaveBeenLastCalledWith({
      tone: 'error',
      title: '方案已恢复，但最近草稿回写失败',
      detail: 'IndexedDB 写入失败',
    })
  })

  it('最近草稿读取异常时会武装自动保存并报告可继续编辑', async () => {
    mockedReadRecentFormationDraft.mockRejectedValue(new Error('读取失败'))

    const setters = createSetters()

    await loadStoredDraftPrompt({
      isDisposed: () => false,
      version: 'v1',
      formations: [createLayout('layout-a', ['slot-1'])],
      champions: [createChampion('bruenor', 1)],
      ...setters,
    })

    expect(setters.setIsDraftPersistenceArmed).toHaveBeenCalledWith(true)
    expect(setters.setDraftStatus).toHaveBeenCalledWith({
      tone: 'error',
      title: '最近草稿读取失败',
      detail: '读取失败 当前仍可继续编辑，但不会自动恢复旧草稿。',
    })
    expect(setters.setDraftPrompt).not.toHaveBeenCalled()
  })
})
