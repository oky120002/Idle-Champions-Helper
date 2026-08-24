export const APP_DATABASE_NAME = 'idle-champions-helper'
const APP_DATABASE_VERSION = 7

export const APP_STORE_NAMES = {
  formationDrafts: 'formationDrafts',
  formationPresets: 'formationPresets',
  userProfileSnapshots: 'userProfileSnapshots',
  credentialVault: 'credentialVault',
  heroAbilityOverrides: 'heroAbilityOverrides',
  dataCollections: 'dataCollections',
  championFilterPresets: 'championFilterPresets',
} as const

function getIndexedDb(): IDBFactory {
  if (typeof indexedDB === 'undefined') {
    throw new Error('当前环境不支持 IndexedDB，本地持久化不可用。')
  }

  return indexedDB
}

export function openAppDatabase(): Promise<IDBDatabase> {
  const indexedDb = getIndexedDb()

  return new Promise((resolve, reject) => {
    const request = indexedDb.open(APP_DATABASE_NAME, APP_DATABASE_VERSION)

    request.onerror = () => reject(request.error ?? new Error('打开 IndexedDB 失败。'))

    request.onblocked = () =>
      reject(new Error('IndexedDB 升级被其他标签页阻塞，请关闭其他标签页后重试。'))

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(APP_STORE_NAMES.formationDrafts)) {
        database.createObjectStore(APP_STORE_NAMES.formationDrafts)
      }

      if (!database.objectStoreNames.contains(APP_STORE_NAMES.formationPresets)) {
        database.createObjectStore(APP_STORE_NAMES.formationPresets)
      }

      if (!database.objectStoreNames.contains(APP_STORE_NAMES.userProfileSnapshots)) {
        database.createObjectStore(APP_STORE_NAMES.userProfileSnapshots)
      }

      if (!database.objectStoreNames.contains(APP_STORE_NAMES.credentialVault)) {
        database.createObjectStore(APP_STORE_NAMES.credentialVault)
      }

      if (!database.objectStoreNames.contains(APP_STORE_NAMES.heroAbilityOverrides)) {
        database.createObjectStore(APP_STORE_NAMES.heroAbilityOverrides)
      }

      if (!database.objectStoreNames.contains(APP_STORE_NAMES.dataCollections)) {
        database.createObjectStore(APP_STORE_NAMES.dataCollections)
      }

      if (!database.objectStoreNames.contains(APP_STORE_NAMES.championFilterPresets)) {
        database.createObjectStore(APP_STORE_NAMES.championFilterPresets)
      }
    }

    request.onsuccess = () => {
      const database = request.result
      // 其他标签页请求升级时自动释放当前连接，从源头避免 blocking。
      database.onversionchange = () => database.close()
      resolve(database)
    }
  })
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 请求失败。'))

    request.onsuccess = () => resolve(request.result)
  })
}

export function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()

    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB 事务失败。'))

    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB 事务已中止。'))
  })
}
