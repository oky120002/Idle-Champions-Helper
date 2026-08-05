import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { UserProfileSnapshot } from '../../domain/user-profile/types'
import { createUserProfileSnapshot } from '../../domain/user-profile/fixtures'
import { unwrap } from '../../../tests/utils/dom-assertions'
import { APP_DATABASE_NAME, APP_STORE_NAMES, openAppDatabase } from '../localDatabase'
import {
  deleteUserProfileData,
  readCredentialVault,
  readUserProfileSnapshot,
  saveCredentialVault,
  saveUserProfileSnapshot,
} from './userProfileStore'

async function resetDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)

    request.onerror = () => reject(request.error ?? new Error('删除测试数据库失败。'))

    request.onblocked = () => reject(new Error('删除测试数据库被阻塞。'))

    request.onsuccess = () => resolve()
  })
}

/** 直接写原始 snapshot（绕过 save 的类型保证），用于腐蚀测试。 */
async function writeRawSnapshot(value: unknown): Promise<void> {
  const database = await openAppDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(APP_STORE_NAMES.userProfileSnapshots, 'readwrite')
      transaction.objectStore(APP_STORE_NAMES.userProfileSnapshots).put(value, 'current')
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('写入失败'))
    })
  } finally {
    database.close()
  }
}

beforeEach(async () => {
  await resetDatabase()
})

afterEach(async () => {
  await resetDatabase()
})

describe('user profile store', () => {
  it('保存和读取 snapshot 返回相同 id 和 updatedAt', async () => {
    const snapshot: UserProfileSnapshot = createUserProfileSnapshot({
      updatedAt: '2026-05-03T00:00:00.000Z',
    })

    await saveUserProfileSnapshot(snapshot)
    const loaded = await readUserProfileSnapshot()

    expect(loaded).not.toBeNull()
    const loadedSnapshot = unwrap(loaded, 'loaded should not be null')
    expect(loadedSnapshot.updatedAt).toBe('2026-05-03T00:00:00.000Z')
    expect(loadedSnapshot.schemaVersion).toBe(1)
  })

  it('credential opt-in 为 false 时 vault 保持为空', async () => {
    const snapshot = createUserProfileSnapshot()
    await saveUserProfileSnapshot(snapshot)

    const vault = await readCredentialVault()
    expect(vault).toBeNull()
  })

  it('删除会清除 snapshot 和 credential vault', async () => {
    await saveUserProfileSnapshot(createUserProfileSnapshot())
    await saveCredentialVault({ userId: '12345678', hash: 'abc123' })

    await deleteUserProfileData()

    await expect(readUserProfileSnapshot()).resolves.toBeNull()
    await expect(readCredentialVault()).resolves.toBeNull()
  })

  it('保存 credential vault 后可以读取', async () => {
    await saveCredentialVault({ userId: '12345678', hash: 'abc123' })

    const vault = await readCredentialVault()
    expect(vault).toEqual({ userId: '12345678', hash: 'abc123' })
  })
})

describe('stored-record 腐蚀校验（C1，#4 NaN 静默零分根因）', () => {
  it('OwnedHero.level=NaN → 读出拒绝（不再裸 cast 进 scoreFormation 致零分）', async () => {
    await writeRawSnapshot({
      schemaVersion: 1,
      ownedHeroes: [{ heroId: '1', level: Number.NaN, isOwned: true }],
      updatedAt: '2026-05-03T00:00:00.000Z',
    })

    await expect(readUserProfileSnapshot()).rejects.toThrow(/存储数据校验失败.*level/)
  })

  it('缺 schemaVersion → 读出拒绝（跨版本/腐蚀检出，不再静默按旧 shape 消费）', async () => {
    await writeRawSnapshot({
      ownedHeroes: [],
      updatedAt: '2026-05-03T00:00:00.000Z',
    })

    await expect(readUserProfileSnapshot()).rejects.toThrow(/存储数据校验失败.*schemaVersion/)
  })
})
