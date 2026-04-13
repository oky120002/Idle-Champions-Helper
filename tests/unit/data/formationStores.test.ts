import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deleteRecentFormationDraft, readRecentFormationDraft, saveRecentFormationDraft } from '../../../src/data/formationDraftStore'
import { deleteFormationPreset, listFormationPresets, saveFormationPreset } from '../../../src/data/formationPresetStore'
import { APP_DATABASE_NAME, APP_STORE_NAMES, openAppDatabase } from '../../../src/data/localDatabase'
import type { FormationDraft, FormationPreset } from '../../../src/domain/types'

function createDraft(updatedAt: string): FormationDraft {
  return {
    schemaVersion: 1,
    dataVersion: 'v1',
    layoutId: 'layout-a',
    scenarioRef: null,
    placements: {
      'slot-1': 'bruenor',
    },
    updatedAt,
  }
}

function createPreset(id: string, updatedAt: string): FormationPreset {
  return {
    id,
    schemaVersion: 1,
    dataVersion: 'v1',
    name: `方案 ${id}`,
    description: '',
    layoutId: 'layout-a',
    placements: {
      'slot-1': 'bruenor',
    },
    scenarioRef: null,
    scenarioTags: [],
    priority: 'medium',
    createdAt: '2026-04-13T00:00:00.000Z',
    updatedAt,
  }
}

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

beforeEach(async () => {
  await resetDatabase()
})

afterEach(async () => {
  await resetDatabase()
})

describe('formation draft and preset stores', () => {
  it('打开数据库时会创建草稿和方案对象仓库', async () => {
    const database = await openAppDatabase()

    try {
      expect(database.objectStoreNames.contains(APP_STORE_NAMES.formationDrafts)).toBe(true)
      expect(database.objectStoreNames.contains(APP_STORE_NAMES.formationPresets)).toBe(true)
    } finally {
      database.close()
    }
  })

  it('最近草稿支持保存、读取和删除', async () => {
    const draft = createDraft('2026-04-13T10:00:00.000Z')

    await saveRecentFormationDraft(draft)
    await expect(readRecentFormationDraft()).resolves.toEqual(draft)

    await deleteRecentFormationDraft()

    await expect(readRecentFormationDraft()).resolves.toBeNull()
  })

  it('方案列表按 updatedAt 倒序返回，并支持删除', async () => {
    const older = createPreset('preset-older', '2026-04-13T09:00:00.000Z')
    const newer = createPreset('preset-newer', '2026-04-13T11:00:00.000Z')

    await saveFormationPreset(older)
    await saveFormationPreset(newer)

    await expect(listFormationPresets()).resolves.toEqual([newer, older])

    await deleteFormationPreset(newer.id)

    await expect(listFormationPresets()).resolves.toEqual([older])
  })
})
