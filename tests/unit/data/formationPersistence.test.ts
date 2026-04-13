import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Champion, FormationLayout } from '../../../src/domain/types'

vi.mock('../../../src/data/client', () => ({
  loadCollectionAtVersion: vi.fn(),
}))

import { loadCollectionAtVersion } from '../../../src/data/client'
import {
  buildDroppedReferenceDetail,
  buildFormationSnapshotPrompt,
  buildRestoreStatusDetail,
  validateFormationPlacements,
} from '../../../src/data/formationPersistence'

function createChampion(id: string, seat: number, name = id): Champion {
  return {
    id,
    name: {
      original: name,
      display: name,
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
      original: `Layout ${id}`,
      display: `布局 ${id}`,
    },
    slots: slotIds.map((slotId, index) => ({
      id: slotId,
      row: 1,
      column: index + 1,
    })),
  }
}

const mockedLoadCollectionAtVersion = vi.mocked(loadCollectionAtVersion)

afterEach(() => {
  mockedLoadCollectionAtVersion.mockReset()
})

describe('formationPersistence helpers', () => {
  it('校验放置结果时会保留合法引用并标记失效槽位和英雄', () => {
    const snapshot = {
      schemaVersion: 1,
      dataVersion: 'v1',
      layoutId: 'layout-a',
      scenarioRef: null,
      placements: {
        'slot-1': 'bruenor',
        'slot-2': 'missing-champion',
        'slot-99': 'celeste',
      },
      updatedAt: '2026-04-13T00:00:00.000Z',
    }

    const result = validateFormationPlacements(
      snapshot,
      [createLayout('layout-a', ['slot-1', 'slot-2'])],
      [createChampion('bruenor', 1), createChampion('celeste', 2)],
    )

    expect(result).toEqual({
      layout: createLayout('layout-a', ['slot-1', 'slot-2']),
      placements: {
        'slot-1': 'bruenor',
      },
      invalidSlotIds: ['slot-99'],
      invalidChampionIds: ['missing-champion'],
    })
  })

  it('生成失效引用摘要时会合并槽位和英雄信息', () => {
    expect(buildDroppedReferenceDetail(['slot-9'], ['champion-a', 'champion-b'])).toBe(
      '1 个槽位引用已失效；2 个英雄引用已失效',
    )
  })

  it('遇到旧 schemaVersion 时直接返回不可恢复提示', async () => {
    const snapshot = {
      schemaVersion: 0,
      dataVersion: 'v1',
      layoutId: 'layout-a',
      scenarioRef: null,
      placements: {
        'slot-1': 'bruenor',
      },
      updatedAt: '2026-04-13T00:00:00.000Z',
    }

    const prompt = await buildFormationSnapshotPrompt(
      snapshot,
      'v1',
      [createLayout('layout-a', ['slot-1'])],
      [createChampion('bruenor', 1)],
      '草稿',
      1,
    )

    expect(prompt).toEqual({
      kind: 'invalid',
      snapshot,
      title: '草稿版本过旧，当前不能直接恢复',
      detail: '当前只识别 schemaVersion=1 的草稿；检测到旧版本为 0。',
    })
    expect(mockedLoadCollectionAtVersion).not.toHaveBeenCalled()
  })

  it('保存版本仍可读时按原版本数据恢复', async () => {
    const snapshot = {
      schemaVersion: 1,
      dataVersion: 'v0',
      layoutId: 'layout-a',
      scenarioRef: null,
      placements: {
        'slot-1': 'bruenor',
      },
      updatedAt: '2026-04-13T00:00:00.000Z',
    }

    const oldLayout = createLayout('layout-a', ['slot-1'])
    const oldChampion = createChampion('bruenor', 1)

    mockedLoadCollectionAtVersion.mockImplementation(async (version, name) => {
      if (version === 'v0' && name === 'formations') {
        return {
          items: [oldLayout],
          updatedAt: '2026-04-12',
        }
      }

      if (version === 'v0' && name === 'champions') {
        return {
          items: [oldChampion],
          updatedAt: '2026-04-12',
        }
      }

      throw new Error(`unexpected request: ${version}/${name}`)
    })

    const prompt = await buildFormationSnapshotPrompt(
      snapshot,
      'v1',
      [],
      [],
      '方案',
      1,
    )

    expect(prompt.kind).toBe('restore')

    if (prompt.kind !== 'restore') {
      return
    }

    expect(prompt.preview.layoutName).toEqual({
      original: 'Layout layout-a',
      display: '布局 layout-a',
    })
    expect(prompt.preview.dataVersion).toBe('v0')
    expect(prompt.preview.restoreMode).toBe('exact')
    expect(prompt.preview.formations).toEqual([oldLayout])
    expect(prompt.preview.champions).toEqual([oldChampion])
    expect(mockedLoadCollectionAtVersion).toHaveBeenCalledTimes(2)
  })

  it('保存版本不可读时回退到当前版本兼容恢复', async () => {
    const snapshot = {
      schemaVersion: 1,
      dataVersion: 'v0',
      layoutId: 'layout-a',
      scenarioRef: null,
      placements: {
        'slot-1': 'bruenor',
        'slot-x': 'celeste',
      },
      updatedAt: '2026-04-13T00:00:00.000Z',
    }

    mockedLoadCollectionAtVersion.mockRejectedValue(new Error('missing version'))

    const prompt = await buildFormationSnapshotPrompt(
      snapshot,
      'v1',
      [createLayout('layout-a', ['slot-1'])],
      [createChampion('bruenor', 1), createChampion('celeste', 2)],
      '草稿',
      1,
    )

    expect(prompt.kind).toBe('restore')

    if (prompt.kind !== 'restore') {
      return
    }

    expect(prompt.preview.dataVersion).toBe('v1')
    expect(prompt.preview.restoreMode).toBe('compatible')
    expect(prompt.preview.invalidSlotIds).toEqual(['slot-x'])
    expect(buildRestoreStatusDetail(prompt.preview)).toBe(
      '保存版本 v0 已不可读，当前按 v1 兼容恢复。 1 个槽位引用已失效',
    )
  })

  it('没有任何有效放置结果时返回不可恢复提示', async () => {
    const snapshot = {
      schemaVersion: 1,
      dataVersion: 'v1',
      layoutId: 'layout-a',
      scenarioRef: null,
      placements: {
        'slot-1': 'missing-champion',
      },
      updatedAt: '2026-04-13T00:00:00.000Z',
    }

    const prompt = await buildFormationSnapshotPrompt(
      snapshot,
      'v1',
      [createLayout('layout-a', ['slot-1'])],
      [createChampion('bruenor', 1)],
      '草稿',
      1,
    )

    expect(prompt).toEqual({
      kind: 'invalid',
      snapshot,
      title: '草稿没有可恢复的有效放置结果',
      detail: '1 个英雄引用已失效',
    })
  })
})
