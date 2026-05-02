import { useCallback, useEffect, useState } from 'react'
import {
  deleteUserProfileData,
  readUserProfileSnapshot,
} from '../../data/user-profile-store'
import type { UserProfileSnapshot } from '../../domain/user-profile/types'

export type SyncState =
  | { status: 'no-snapshot' }
  | { status: 'loaded'; snapshot: UserProfileSnapshot; ageDays: number }
  | { status: 'error'; message: string }

export function useUserSyncModel() {
  const [syncState, setSyncState] = useState<SyncState>({ status: 'no-snapshot' })
  const [busy, setBusy] = useState(false)

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
    setBusy(true)
    try {
      await loadSnapshot()
    } finally {
      setBusy(false)
    }
  }, [loadSnapshot])

  const handleSimulateError = useCallback(() => {
    setSyncState({ status: 'error', message: '同步失败：无法连接到本地数据存储' })

  }, [])

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
    handleSync,
    handleSimulateError,
    handleDelete,
    reload: loadSnapshot,
  }
}
