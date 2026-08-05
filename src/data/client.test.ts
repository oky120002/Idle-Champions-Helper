import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_DATABASE_NAME, APP_STORE_NAMES, openAppDatabase } from './localDatabase'

/**
 * C2：collection IndexedDB 持久缓存。
 * loadCollectionAtVersion 在 memoryCache 与 fetch 之间插入 IDB 层——刷新后同 version
 * 命中持久缓存，省 1.0MB gzip 重下 + 17.8MB 重 parse（performance-audit §6#1）。
 * 读出走 zod 校验（具名 collection 深校验 + 其余信封校验）；腐蚀当 miss 回退 fetch。
 * version.current 变更 → cacheKey `${version}:${name}` 变 → 天然失效。
 */

const CHAMPIONS = 'champions'

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

function championsCollection(updatedAt: string, items: unknown[] = [validChampion()]) {
  return { items, updatedAt }
}

/** 满足 championSchema 核心字段的合法英雄项（深校验正向 round-trip 用）。 */
function validChampion(id = 'a') {
  return {
    id,
    name: { original: id, display: id },
    seat: 1,
    roles: [],
    affiliations: [],
    tags: [],
  }
}

async function resetDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)
    request.onerror = () => reject(request.error ?? new Error('删除测试数据库失败。'))
    request.onblocked = () => reject(new Error('删除测试数据库被阻塞。'))
    request.onsuccess = () => resolve()
  })
}

/** 绕过 loadCollectionAtVersion 直接写原始记录，用于腐蚀/预热。 */
async function writeRawCollection(cacheKey: string, value: unknown): Promise<void> {
  const database = await openAppDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(APP_STORE_NAMES.dataCollections, 'readwrite')
      transaction.objectStore(APP_STORE_NAMES.dataCollections).put(value, cacheKey)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('写入失败'))
    })
  } finally {
    database.close()
  }
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(async () => {
  await resetDatabase()
  vi.resetModules()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('collection IndexedDB 持久缓存（C2）', () => {
  it('打开数据库时创建 dataCollections 仓库（DB v6）', async () => {
    const database = await openAppDatabase()
    try {
      expect(database.objectStoreNames.contains(APP_STORE_NAMES.dataCollections)).toBe(true)
      expect(database.version).toBe(6)
    } finally {
      database.close()
    }
  })

  it('cache miss → fetch 并持久化；跨 reload 命中 IDB 不再 fetch', async () => {
    vi.resetModules()
    const clientA = await import('./client')
    fetchMock.mockResolvedValue(jsonResponse(championsCollection('t1')))

    const first = await clientA.loadCollectionAtVersion('v1', CHAMPIONS)
    expect(first.updatedAt).toBe('t1')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // 新 session：memory 已清，IDB 持久缓存命中。
    vi.resetModules()
    const clientB = await import('./client')
    fetchMock.mockClear()
    const second = await clientB.loadCollectionAtVersion('v1', CHAMPIONS)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(second.updatedAt).toBe('t1')
  })

  it('同 session 二次调用走 memoryCache，不再 fetch', async () => {
    const { loadCollectionAtVersion } = await import('./client')
    fetchMock.mockResolvedValue(jsonResponse(championsCollection('t1')))

    await loadCollectionAtVersion('v1', CHAMPIONS)
    await loadCollectionAtVersion('v1', CHAMPIONS)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('不同 version → cacheKey 变 → miss → fetch（版本失效）', async () => {
    vi.resetModules()
    const clientA = await import('./client')
    fetchMock.mockResolvedValue(jsonResponse(championsCollection('t1')))
    await clientA.loadCollectionAtVersion('v1', CHAMPIONS)

    vi.resetModules()
    const clientB = await import('./client')
    fetchMock.mockResolvedValue(jsonResponse(championsCollection('t2')))
    const result = await clientB.loadCollectionAtVersion('v2', CHAMPIONS)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.updatedAt).toBe('t2')
  })

  it('IDB 记录信封腐蚀（items 非数组）→ 当 miss 回退 fetch', async () => {
    await writeRawCollection('v1:champions', { items: 'not-an-array', updatedAt: 't1' })
    const { loadCollectionAtVersion } = await import('./client')
    fetchMock.mockResolvedValue(jsonResponse(championsCollection('t2')))

    const result = await loadCollectionAtVersion('v1', CHAMPIONS)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.updatedAt).toBe('t2')
  })

  it('champions item 形状腐蚀（缺 seat 等核心字段）→ 深校验当 miss 回退 fetch', async () => {
    await writeRawCollection('v1:champions', championsCollection('t1', [{ id: 'a' }]))
    const { loadCollectionAtVersion } = await import('./client')
    fetchMock.mockResolvedValue(jsonResponse(championsCollection('t2')))

    const result = await loadCollectionAtVersion('v1', CHAMPIONS)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.updatedAt).toBe('t2')
  })

  it('无具名 schema 的 collection 仅做信封校验 → 命中不 fetch', async () => {
    await writeRawCollection('v1:enums', { items: [{ whatever: 1 }], updatedAt: 't1' })
    const { loadCollectionAtVersion } = await import('./client')
    fetchMock.mockResolvedValue(jsonResponse({ items: [], updatedAt: 't2' }))

    const result = await loadCollectionAtVersion('v1', 'enums')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.items).toEqual([{ whatever: 1 }])
  })
})
