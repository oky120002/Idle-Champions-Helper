import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_DATABASE_NAME } from '../../../src/data/localDatabase'
import {
  readPreferredUserProfileSource,
  resolveUserProfileSnapshot,
  savePreferredUserProfileSource,
} from '../../../src/data/user-profile-store'
import { readUserProfileSnapshot, saveUserProfileSnapshot } from '../../../src/data/user-profile-store'
import { createUserProfileSnapshot } from '../../../src/domain/user-profile/fixtures'

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key) {
      return values.get(key) ?? null
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key) {
      values.delete(key)
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

async function resetDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)

    request.onerror = () => {
      reject(request.error ?? new Error('删除测试数据库失败。'))
    }

    request.onblocked = () => {
      resolve()
    }

    request.onsuccess = () => {
      resolve()
    }
  })
}

beforeEach(async () => {
  vi.restoreAllMocks()
  await resetDatabase()
})

afterEach(async () => {
  vi.restoreAllMocks()
  await resetDatabase()
})

describe('user profile source resolver', () => {
  it('默认使用浏览器同步快照，并允许保存开发态来源偏好', () => {
    const storage = createMemoryStorage()
    expect(readPreferredUserProfileSource(storage)).toBe('browser-sync')

    savePreferredUserProfileSource('local-dev-snapshot', storage)

    expect(readPreferredUserProfileSource(storage)).toBe('local-dev-snapshot')
  })

  it('浏览器同步来源读取 IndexedDB 快照', async () => {
    await saveUserProfileSnapshot(
      createUserProfileSnapshot({ updatedAt: '2026-05-29T00:00:00.000Z' }),
    )

    const resolution = await resolveUserProfileSnapshot('browser-sync')

    expect(resolution.selectedSource).toBe('browser-sync')
    expect(resolution.resolvedSource).toBe('browser-sync')
    expect(resolution.snapshot?.updatedAt).toBe('2026-05-29T00:00:00.000Z')
    expect(resolution.errorMessage).toBeNull()
    expect(resolution.persisted).toBe(true)
  })

  it('本地开发来源只读解析私有快照，不写入浏览器同步快照', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        userDetails: {
          details: {
            heroes: [
              { hero_id: '1', level: 500, equipment: { 0: 3 }, feats: [], legendary_effects: [] },
            ],
          },
        },
        campaignDetails: {
          campaigns: [{ campaign_id: '1', favor: '1.50e92' }],
        },
        formationSaves: {
          all_saves: [{ formation_id: 'fm-1', layout_id: 'layout-grand-tour', adventure_id: '10' }],
        },
      }),
    }))

    const resolution = await resolveUserProfileSnapshot('local-dev-snapshot')

    expect(resolution.selectedSource).toBe('local-dev-snapshot')
    expect(resolution.resolvedSource).toBe('local-dev-snapshot')
    expect(resolution.snapshot?.ownedHeroes).toHaveLength(1)
    expect(resolution.persisted).toBe(false)
    await expect(readUserProfileSnapshot()).resolves.toBeNull()
  })
})
