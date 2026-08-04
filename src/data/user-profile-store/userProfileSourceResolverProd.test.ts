import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { APP_DATABASE_NAME } from '../localDatabase'
import { createUserProfileSnapshot } from '../../domain/user-profile/fixtures'
import { saveUserProfileSnapshot } from './userProfileStore'
import {
  isLocalDevUserProfileSourceEnabled,
  readPreferredUserProfileSource,
  resolveUserProfileSnapshot,
  savePreferredUserProfileSource,
} from './userProfileSourceResolver.prod'

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
  await resetDatabase()
})

afterEach(async () => {
  await resetDatabase()
})

describe('production user profile source resolver', () => {
  it('生产 resolver 永远禁用本地开发来源', () => {
    expect(isLocalDevUserProfileSourceEnabled()).toBe(false)
    expect(readPreferredUserProfileSource()).toBe('browser-sync')

    savePreferredUserProfileSource('local-dev-snapshot')

    expect(readPreferredUserProfileSource()).toBe('browser-sync')
  })

  it('生产 resolver 只读取浏览器同步快照', async () => {
    await saveUserProfileSnapshot(
      createUserProfileSnapshot({ updatedAt: '2026-05-29T00:00:00.000Z' }),
    )

    const resolution = await resolveUserProfileSnapshot()

    expect(resolution.selectedSource).toBe('browser-sync')
    expect(resolution.resolvedSource).toBe('browser-sync')
    expect(resolution.snapshot?.updatedAt).toBe('2026-05-29T00:00:00.000Z')
    expect(resolution.persisted).toBe(true)
  })
})
