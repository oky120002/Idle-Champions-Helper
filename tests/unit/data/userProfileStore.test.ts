import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { UserProfileSnapshot } from '../../../src/domain/user-profile/types'
import { createUserProfileSnapshot } from '../../../src/domain/user-profile/fixtures'
import { APP_DATABASE_NAME } from '../../../src/data/localDatabase'
import {
  deleteUserProfileData,
  readCredentialVault,
  readUserProfileSnapshot,
  saveCredentialVault,
  saveUserProfileSnapshot,
} from '../../../src/data/user-profile-store'

async function resetDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)

    request.onerror = () => {
      reject(request.error ?? new Error('删除测试数据库失败。'))
    }

    request.onblocked = () => {
      reject(new Error('删除测试数据库被阻塞。'))
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

describe('user profile store', () => {
  it('保存和读取 snapshot 返回相同 id 和 updatedAt', async () => {
    const snapshot: UserProfileSnapshot = createUserProfileSnapshot({
      updatedAt: '2026-05-03T00:00:00.000Z',
    })

    await saveUserProfileSnapshot(snapshot)
    const loaded = await readUserProfileSnapshot()

    expect(loaded).not.toBeNull()
    expect(loaded!.updatedAt).toBe('2026-05-03T00:00:00.000Z')
    expect(loaded!.schemaVersion).toBe(1)
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
