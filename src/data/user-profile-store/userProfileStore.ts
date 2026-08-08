import type { UserProfileSnapshot } from '../../domain/user-profile/types'
import { parseStoredRecord, userProfileSnapshotSchema } from '../../domain/types/stored-record-schemas'
import { APP_STORE_NAMES, openAppDatabase, requestToPromise, waitForTransaction } from '../localDatabase'

const SNAPSHOT_KEY = 'current'
const CREDENTIAL_KEY = 'credentials'

export async function readUserProfileSnapshot(): Promise<UserProfileSnapshot | null> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.userProfileSnapshots, 'readonly')
    const store = transaction.objectStore(APP_STORE_NAMES.userProfileSnapshots)
    const raw = await requestToPromise(store.get(SNAPSHOT_KEY) as IDBRequest<unknown>)
    await waitForTransaction(transaction)
    // 腐蚀校验：stale 跨版本快照或 IDB 腐蚀（如 OwnedHero.level=NaN）会让 scoreFormation 静默零分（#4），
    // 读出处统一校验失败即 throw，由 resolveUserProfileSnapshot 内部 catch 降级为 null。
    return raw != null ? (parseStoredRecord(raw, userProfileSnapshotSchema, 'user profile snapshot') as UserProfileSnapshot) : null
  } finally {
    database.close()
  }
}

export async function saveUserProfileSnapshot(snapshot: UserProfileSnapshot): Promise<void> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.userProfileSnapshots, 'readwrite')
    const store = transaction.objectStore(APP_STORE_NAMES.userProfileSnapshots)
    await requestToPromise(store.put(snapshot, SNAPSHOT_KEY))
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function deleteUserProfileData(): Promise<void> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(
      [APP_STORE_NAMES.userProfileSnapshots, APP_STORE_NAMES.credentialVault],
      'readwrite',
    )
    const snapshotStore = transaction.objectStore(APP_STORE_NAMES.userProfileSnapshots)
    const credentialStore = transaction.objectStore(APP_STORE_NAMES.credentialVault)
    await requestToPromise(snapshotStore.delete(SNAPSHOT_KEY))
    await requestToPromise(credentialStore.delete(CREDENTIAL_KEY))
    await waitForTransaction(transaction)
  } finally {
    database.close()
  }
}
