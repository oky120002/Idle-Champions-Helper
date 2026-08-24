import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ChampionFilterPreset } from '../domain/types'
import { APP_DATABASE_NAME, APP_STORE_NAMES, openAppDatabase } from './localDatabase'
import { deleteChampionFilterPreset, listChampionFilterPresets, saveChampionFilterPreset } from './championFilterPresetStore'

const filters = {
  search: 'support',
  selectedSeats: [1],
  selectedRoles: ['support'],
  selectedAffiliations: [],
  selectedRaces: [],
  selectedGenders: [],
  selectedAlignments: [],
  selectedProfessions: [],
  selectedAcquisitions: [],
  selectedMechanics: [],
  selectedPatrons: [],
}

function createPreset(id: string, updatedAt: string): ChampionFilterPreset {
  return { id, schemaVersion: 1, name: id, filters, createdAt: updatedAt, updatedAt }
}

async function resetDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)
    request.onerror = () => reject(request.error ?? new Error('删除测试数据库失败。'))
    request.onblocked = () => reject(new Error('删除测试数据库被阻塞。'))
    request.onsuccess = () => resolve()
  })
}

async function writeRawRecord(key: string, value: unknown): Promise<void> {
  const database = await openAppDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(APP_STORE_NAMES.championFilterPresets, 'readwrite')
      transaction.objectStore(APP_STORE_NAMES.championFilterPresets).put(value, key)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('写入失败'))
    })
  } finally {
    database.close()
  }
}

beforeEach(resetDatabase)
afterEach(resetDatabase)

describe('champion filter preset store', () => {
  it('保存、按更新时间倒序读取并删除筛选组合', async () => {
    const older = createPreset('older', '2026-08-24T09:00:00.000Z')
    const newer = createPreset('newer', '2026-08-24T10:00:00.000Z')
    await saveChampionFilterPreset(older)
    await saveChampionFilterPreset(newer)

    await expect(listChampionFilterPresets()).resolves.toEqual([newer, older])
    await deleteChampionFilterPreset(newer.id)
    await expect(listChampionFilterPresets()).resolves.toEqual([older])
  })

  it('坏记录不会阻塞有效筛选组合读取', async () => {
    const valid = createPreset('valid', '2026-08-24T09:00:00.000Z')
    await writeRawRecord('valid', valid)
    await writeRawRecord('bad', { id: 'bad', schemaVersion: 1, name: 'bad', filters: {} })

    await expect(listChampionFilterPresets()).resolves.toEqual([valid])
  })
})
