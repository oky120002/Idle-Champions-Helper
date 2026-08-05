import type { ChampionDetail, DataCollection, DataVersion } from '../domain/types'
import { getCollectionReadSchema } from '../domain/types/collection-schemas'
import type { SearchDocumentCollection } from '../features/search/searchTypes'
import { APP_STORE_NAMES, openAppDatabase, requestToPromise, waitForTransaction } from './localDatabase'

const memoryCache = new Map<string, unknown>()

export function resolveDataUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`

  return `${base}data/${relativePath}`
}

export async function fetchJson<T>(relativePath: string, init?: RequestInit): Promise<T> {
  const response = await fetch(resolveDataUrl(relativePath), init)

  if (!response.ok) {
    throw new Error(`HTTP ${String(response.status)}`)
  }

  return (await response.json()) as T
}

async function fetchArrayBuffer(relativePath: string, init?: RequestInit): Promise<ArrayBuffer> {
  const response = await fetch(resolveDataUrl(relativePath), init)

  if (!response.ok) {
    throw new Error(`HTTP ${String(response.status)}`)
  }

  return response.arrayBuffer()
}

export async function loadVersion(): Promise<DataVersion> {
  const cacheKey = 'version'
  const cached = memoryCache.get(cacheKey)

  if (cached != null) {
    return cached as DataVersion
  }

  const version = await fetchJson<DataVersion>('version.json', { cache: 'no-store' })
  memoryCache.set(cacheKey, version)
  return version
}

/**
 * collection IndexedDB 持久缓存（C2，performance-audit §6#1）：刷新后同 version 命中持久缓存，
 * 省 1.0MB gzip 重下 + 17.8MB 重 parse。version.current 变更 → cacheKey 变 → 天然失效。
 * 读出走 zod 校验（具名深校验 + 其余信封校验）；腐蚀当 miss 回退 fetch 并清坏键。
 * IDB 不可用或出错一律降级 fetch（零回归）。
 */
async function withCollectionStore<R>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<R>,
): Promise<R | undefined> {
  let database: IDBDatabase
  try {
    database = await openAppDatabase()
  } catch {
    return undefined
  }

  try {
    const transaction = database.transaction(APP_STORE_NAMES.dataCollections, mode)
    const result = await fn(transaction.objectStore(APP_STORE_NAMES.dataCollections))
    await waitForTransaction(transaction)
    return result
  } catch {
    return undefined
  } finally {
    database.close()
  }
}

async function readCollectionCache<T>(cacheKey: string, name: string): Promise<DataCollection<T> | undefined> {
  const raw = await withCollectionStore('readonly', async (store) =>
    requestToPromise(store.get(cacheKey) as IDBRequest<unknown>),
  )
  if (raw === undefined) {
    return undefined
  }

  const result = getCollectionReadSchema(name).safeParse(raw)
  if (result.success) {
    return result.data as DataCollection<T>
  }

  await deleteCollectionCache(cacheKey)
  return undefined
}

async function writeCollectionCache(cacheKey: string, collection: DataCollection<unknown>): Promise<void> {
  await withCollectionStore('readwrite', async (store) =>
    requestToPromise(store.put(collection, cacheKey)),
  )
}

async function deleteCollectionCache(cacheKey: string): Promise<void> {
  await withCollectionStore('readwrite', async (store) =>
    requestToPromise(store.delete(cacheKey)),
  )
}

export async function loadCollectionAtVersion<T>(version: string, name: string): Promise<DataCollection<T>> {
  const cacheKey = `${version}:${name}`
  const cached = memoryCache.get(cacheKey)

  if (cached != null) {
    return cached as DataCollection<T>
  }

  const idbCached = await readCollectionCache<T>(cacheKey, name)
  if (idbCached) {
    memoryCache.set(cacheKey, idbCached)
    return idbCached
  }

  const collection = await fetchJson<DataCollection<T>>(`${version}/${name}.json`)
  memoryCache.set(cacheKey, collection)
  await writeCollectionCache(cacheKey, collection)
  return collection
}

export async function loadCollection<T>(name: string): Promise<DataCollection<T>> {
  const version = await loadVersion()
  return loadCollectionAtVersion<T>(version.current, name)
}

export async function loadBinaryData(relativePath: string): Promise<ArrayBuffer> {
  const cacheKey = `binary:${relativePath}`
  const cached = memoryCache.get(cacheKey)

  if (cached != null) {
    return cached as ArrayBuffer
  }

  const buffer = await fetchArrayBuffer(relativePath)
  memoryCache.set(cacheKey, buffer)
  return buffer
}

export async function loadChampionDetailAtVersion(
  version: string,
  championId: string,
): Promise<ChampionDetail> {
  const cacheKey = `${version}:champion-details:${championId}`
  const cached = memoryCache.get(cacheKey)

  if (cached != null) {
    return cached as ChampionDetail
  }

  const detail = await fetchJson<ChampionDetail>(`${version}/champion-details/${championId}.json`)
  memoryCache.set(cacheKey, detail)
  return detail
}

export async function loadChampionDetail(championId: string): Promise<ChampionDetail> {
  const version = await loadVersion()
  return loadChampionDetailAtVersion(version.current, championId)
}

export async function loadSearchDocuments(): Promise<SearchDocumentCollection> {
  const cacheKey = 'search-documents'
  const cached = memoryCache.get(cacheKey)

  if (cached != null) {
    return cached as SearchDocumentCollection
  }

  const collection = await fetchJson<SearchDocumentCollection>('v1/search/search-documents.json')
  memoryCache.set(cacheKey, collection)
  return collection
}
