import type { FormationPreset } from '../domain/types'
import { APP_STORE_NAMES, openAppDatabase, requestToPromise, waitForTransaction } from './localDatabase'

function sortByUpdatedAtDescending(items: FormationPreset[]): FormationPreset[] {
  return [...items].sort((left, right) => {
    const rightTime = Date.parse(right.updatedAt)
    const leftTime = Date.parse(left.updatedAt)

    if (Number.isNaN(rightTime) || Number.isNaN(leftTime)) {
      return right.updatedAt.localeCompare(left.updatedAt)
    }

    return rightTime - leftTime
  })
}

export async function listFormationPresets(): Promise<FormationPreset[]> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.formationPresets, 'readonly')
    const store = transaction.objectStore(APP_STORE_NAMES.formationPresets)
    const presets = await requestToPromise(store.getAll() as IDBRequest<FormationPreset[]>)
    await waitForTransaction(transaction)
    return sortByUpdatedAtDescending(presets)
  } finally {
    database.close()
  }
}

export async function saveFormationPreset(preset: FormationPreset): Promise<void> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.formationPresets, 'readwrite')
    const store = transaction.objectStore(APP_STORE_NAMES.formationPresets)
    await requestToPromise(store.put(preset, preset.id))
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function deleteFormationPreset(presetId: string): Promise<void> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.formationPresets, 'readwrite')
    const store = transaction.objectStore(APP_STORE_NAMES.formationPresets)
    await requestToPromise(store.delete(presetId))
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}
