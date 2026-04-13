import type { FormationDraft } from '../domain/types'

const DATABASE_NAME = 'idle-champions-helper'
const DATABASE_VERSION = 1
const STORE_NAME = 'formationDrafts'
const RECENT_DRAFT_KEY = 'recent'

function getIndexedDb(): IDBFactory {
  if (typeof indexedDB === 'undefined') {
    throw new Error('当前环境不支持 IndexedDB，最近草稿无法持久化。')
  }

  return indexedDB
}

function openDatabase(): Promise<IDBDatabase> {
  const indexedDb = getIndexedDb()

  return new Promise((resolve, reject) => {
    const request = indexedDb.open(DATABASE_NAME, DATABASE_VERSION)

    request.onerror = () => {
      reject(request.error ?? new Error('打开 IndexedDB 失败。'))
    }

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB 请求失败。'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve()
    }

    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB 事务失败。'))
    }

    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB 事务已中止。'))
    }
  })
}

export async function readRecentFormationDraft(): Promise<FormationDraft | null> {
  const database = await openDatabase()

  try {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const draft = await requestToPromise(store.get(RECENT_DRAFT_KEY) as IDBRequest<FormationDraft | undefined>)
    await waitForTransaction(transaction)
    return draft ?? null
  } finally {
    database.close()
  }
}

export async function saveRecentFormationDraft(draft: FormationDraft): Promise<void> {
  const database = await openDatabase()

  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await requestToPromise(store.put(draft, RECENT_DRAFT_KEY))
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function deleteRecentFormationDraft(): Promise<void> {
  const database = await openDatabase()

  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    await requestToPromise(store.delete(RECENT_DRAFT_KEY))
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}
