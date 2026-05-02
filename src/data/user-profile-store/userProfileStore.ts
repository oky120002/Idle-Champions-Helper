import type { UserProfileSnapshot } from '../../domain/user-profile/types'
import { APP_STORE_NAMES, openAppDatabase, requestToPromise, waitForTransaction } from '../localDatabase'

const SNAPSHOT_KEY = 'current'
const CREDENTIAL_KEY = 'credentials'

export async function readUserProfileSnapshot(): Promise<UserProfileSnapshot | null> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.userProfileSnapshots, 'readonly')
    const store = transaction.objectStore(APP_STORE_NAMES.userProfileSnapshots)
    const snapshot = await requestToPromise(
      store.get(SNAPSHOT_KEY) as IDBRequest<UserProfileSnapshot | undefined>,
    )
    await waitForTransaction(transaction)
    return snapshot ?? null
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

export async function readCredentialVault(): Promise<{ userId: string; hash: string } | null> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.credentialVault, 'readonly')
    const store = transaction.objectStore(APP_STORE_NAMES.credentialVault)
    const record = await requestToPromise(
      store.get(CREDENTIAL_KEY) as IDBRequest<{ userId: string; hash: string } | undefined>,
    )
    await waitForTransaction(transaction)
    return record ?? null
  } finally {
    database.close()
  }
}

export async function saveCredentialVault(credentials: {
  userId: string
  hash: string
}): Promise<void> {
  const database = await openAppDatabase()

  try {
    const transaction = database.transaction(APP_STORE_NAMES.credentialVault, 'readwrite')
    const store = transaction.objectStore(APP_STORE_NAMES.credentialVault)
    await requestToPromise(store.put(credentials, CREDENTIAL_KEY))
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
