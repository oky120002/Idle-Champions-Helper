import type { ChampionFilterPreset } from '../domain/types'
import { championFilterPresetSchema, parseStoredRecord } from '../domain/types/stored-record-schemas'
import { APP_STORE_NAMES, openAppDatabase, requestToPromise, waitForTransaction } from './localDatabase'

function sortByUpdatedAtDescending(items: ChampionFilterPreset[]): ChampionFilterPreset[] {
  return [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export async function listChampionFilterPresets(): Promise<ChampionFilterPreset[]> {
  const database = await openAppDatabase()
  try {
    const transaction = database.transaction(APP_STORE_NAMES.championFilterPresets, 'readonly')
    const raw = await requestToPromise(transaction.objectStore(APP_STORE_NAMES.championFilterPresets).getAll() as IDBRequest<unknown[]>)
    await waitForTransaction(transaction)
    const valid: ChampionFilterPreset[] = []
    for (const item of raw) {
      try {
        valid.push(parseStoredRecord(item, championFilterPresetSchema, 'champion filter preset') as ChampionFilterPreset)
      } catch {
        // Ignore one corrupted local record so the remaining presets remain usable.
      }
    }
    return sortByUpdatedAtDescending(valid)
  } finally {
    database.close()
  }
}

export async function saveChampionFilterPreset(preset: ChampionFilterPreset): Promise<void> {
  const database = await openAppDatabase()
  try {
    const transaction = database.transaction(APP_STORE_NAMES.championFilterPresets, 'readwrite')
    await requestToPromise(transaction.objectStore(APP_STORE_NAMES.championFilterPresets).put(preset, preset.id))
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function deleteChampionFilterPreset(presetId: string): Promise<void> {
  const database = await openAppDatabase()
  try {
    const transaction = database.transaction(APP_STORE_NAMES.championFilterPresets, 'readwrite')
    await requestToPromise(transaction.objectStore(APP_STORE_NAMES.championFilterPresets).delete(presetId))
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}
