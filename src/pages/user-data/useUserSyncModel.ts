import { useCallback, useEffect, useState } from 'react'
import {
  deleteUserProfileData,
  readUserProfileSnapshot,
  saveUserProfileSnapshot,
} from '../../data/user-profile-store'
import { fetchUserProfilePayloads } from '../../data/user-sync/officialClient'
import { buildUserProfileSnapshot } from '../../data/user-sync/userProfileNormalizer'
import type { UserCredentials } from '../../domain/types'
import type { UserProfileSnapshot } from '../../domain/user-profile/types'

export type SyncState =
  | { status: 'no-snapshot' }
  | { status: 'loaded'; snapshot: UserProfileSnapshot; ageDays: number }
  | { status: 'error'; message: string }

const LOCAL_DEV_SNAPSHOT_UNAVAILABLE_MESSAGE = '本地开发快照导入只允许在 Vite 开发模式中使用。'
const LOCAL_DEV_SNAPSHOT_ERROR_MESSAGE = '读取本地开发快照失败：请检查本地私有快照是否已准备好，并确认当前处于 Vite 开发环境。'

async function fetchLocalDevPrivateSnapshotPayloadsForDevOnly() {
  if (!import.meta.env.DEV) {
    throw new Error(LOCAL_DEV_SNAPSHOT_UNAVAILABLE_MESSAGE)
  }

  const module = await import('../../data/user-sync/localDevPrivateSnapshot')
  return module.fetchLocalDevPrivateSnapshotPayloads()
}

export function useUserSyncModel(credentials: UserCredentials | null = null) {
  const [syncState, setSyncState] = useState<SyncState>({ status: 'no-snapshot' })
  const [busy, setBusy] = useState(false)
  const showLocalDevSnapshotAction = import.meta.env.DEV

  const loadSnapshot = useCallback(async () => {
    try {
      const snapshot = await readUserProfileSnapshot()
      if (!snapshot) {
        setSyncState({ status: 'no-snapshot' })
        return
      }

      const ageMs = Date.now() - new Date(snapshot.updatedAt).getTime()
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))
      setSyncState({ status: 'loaded', snapshot, ageDays })
    } catch {
      setSyncState({ status: 'error', message: '读取本地数据失败' })
    }
  }, [])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  const handleSync = useCallback(async () => {
    if (!credentials) {
      setSyncState({ status: 'error', message: '请先读取并校验凭证，再手动同步。' })
      return
    }

    setBusy(true)
    try {
      const payloads = await fetchUserProfilePayloads(credentials)
      const snapshot = buildUserProfileSnapshot(payloads)
      await saveUserProfileSnapshot(snapshot)
      await loadSnapshot()
    } catch (error) {
      setSyncState({
        status: 'error',
        message: error instanceof Error
          ? error.message
          : '官方数据同步失败：请检查凭证、网络或官方接口可用性。',
      })
    } finally {
      setBusy(false)
    }
  }, [credentials, loadSnapshot])

  const handleLoadLocalDevSnapshot = useCallback(async () => {
    if (!showLocalDevSnapshotAction) {
      setSyncState({ status: 'error', message: LOCAL_DEV_SNAPSHOT_UNAVAILABLE_MESSAGE })
      return
    }

    setBusy(true)
    try {
      const payloads = await fetchLocalDevPrivateSnapshotPayloadsForDevOnly()
      const snapshot = buildUserProfileSnapshot(payloads)
      await saveUserProfileSnapshot(snapshot)
      await loadSnapshot()
    } catch (error) {
      setSyncState({
        status: 'error',
        message: error instanceof Error
          ? error.message
          : LOCAL_DEV_SNAPSHOT_ERROR_MESSAGE,
      })
    } finally {
      setBusy(false)
    }
  }, [loadSnapshot, showLocalDevSnapshotAction])

  const handleDelete = useCallback(async () => {
    setBusy(true)
    try {
      await deleteUserProfileData()
      setSyncState({ status: 'no-snapshot' })
    } catch {
      setSyncState({ status: 'error', message: '删除失败' })
    } finally {
      setBusy(false)
    }
  }, [])

  return {
    syncState,
    busy,
    canSync: Boolean(credentials) && !busy,
    canLoadLocalDevSnapshot: showLocalDevSnapshotAction && !busy,
    showLocalDevSnapshotAction,
    handleSync,
    handleLoadLocalDevSnapshot,
    handleDelete,
    reload: loadSnapshot,
  }
}
