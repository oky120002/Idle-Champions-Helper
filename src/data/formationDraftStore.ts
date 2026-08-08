import type { FormationDraft } from '../domain/types'
import { formationDraftSchema, parseStoredRecord } from '../domain/types/stored-record-schemas'
import { APP_STORE_NAMES, openAppDatabase, requestToPromise, waitForTransaction } from './localDatabase'

const RECENT_DRAFT_KEY = 'recent'

export async function readRecentFormationDraft(): Promise<FormationDraft | null> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.formationDrafts, 'readonly')
    const store = transaction.objectStore(APP_STORE_NAMES.formationDrafts)
    const raw = await requestToPromise(store.get(RECENT_DRAFT_KEY) as IDBRequest<unknown>)
    await waitForTransaction(transaction)
    if (raw == null) {
      return null
    }
    try {
      return parseStoredRecord(raw, formationDraftSchema, 'formation draft') as FormationDraft
    } catch {
      // 腐蚀记录自动清理，避免每次加载重复报错（参照 client.ts readCollectionCache 模式）
      const deleteTx = database.transaction(APP_STORE_NAMES.formationDrafts, 'readwrite')
      await requestToPromise(deleteTx.objectStore(APP_STORE_NAMES.formationDrafts).delete(RECENT_DRAFT_KEY))
      await waitForTransaction(deleteTx)
      return null
    }
  } finally {
    database.close()
  }
}

export async function saveRecentFormationDraft(draft: FormationDraft): Promise<void> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.formationDrafts, 'readwrite')
    const store = transaction.objectStore(APP_STORE_NAMES.formationDrafts)
    await requestToPromise(store.put(draft, RECENT_DRAFT_KEY))
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function deleteRecentFormationDraft(): Promise<void> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.formationDrafts, 'readwrite')
    const store = transaction.objectStore(APP_STORE_NAMES.formationDrafts)
    await requestToPromise(store.delete(RECENT_DRAFT_KEY))
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}
