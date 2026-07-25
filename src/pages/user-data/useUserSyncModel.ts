import { useCallback, useEffect, useState } from 'react'
import {
  deleteUserProfileData,
  readPreferredUserProfileSource,
  readUserProfileSnapshot,
  resolveUserProfileSnapshot,
  savePreferredUserProfileSource,
  saveUserProfileSnapshot,
} from '../../data/user-profile-store'
import { clearPlannerHeroOverrides } from '../../data/plannerOverridesStore'
import { fetchUserProfilePayloads } from '../../data/user-sync/officialClient'
import { buildUserProfileSnapshot } from '../../data/user-sync/userProfileNormalizer'
import type { UserCredentials } from '../../domain/types'
import type { UserProfileSnapshot } from '../../domain/user-profile/types'
import type {
  UserProfileResolution,
  UserProfileSourceKind,
} from '../../data/user-profile-store'
import {
  canUseLocalDevSnapshotAction,
  refreshLocalDevSnapshot,
  trySelectLocalDevSnapshot,
} from './userSyncLocalDevAction'

export type SyncState =
  | { status: 'no-snapshot' }
  | { status: 'loaded'; snapshot: UserProfileSnapshot; ageDays: number }
  | { status: 'error'; message: string }

export type LocalDevRefreshState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

export function useUserSyncModel(credentials: UserCredentials | null = null) {
  const [syncState, setSyncState] = useState<SyncState>({ status: 'no-snapshot' })
  const [busy, setBusy] = useState(false)
  const [localDevRefreshState, setLocalDevRefreshState] = useState<LocalDevRefreshState>({ status: 'idle' })
  const showLocalDevSnapshotAction = canUseLocalDevSnapshotAction()
  const [selectedProfileSource, setSelectedProfileSource] = useState<UserProfileSourceKind>(
    () => readPreferredUserProfileSource(),
  )
  const [profileResolution, setProfileResolution] = useState<UserProfileResolution>(() => {
    const initialSource = readPreferredUserProfileSource()
    return {
      selectedSource: initialSource,
      resolvedSource: null,
      snapshot: null,
      errorMessage: null,
      persisted: initialSource === 'browser-sync',
    }
  })

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

  const loadProfileResolution = useCallback(async (preferredSource: UserProfileSourceKind) => {
    const resolution = await resolveUserProfileSnapshot(preferredSource)
    setProfileResolution(resolution)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount，所有 setState 均在 await 之后，非同步
    void loadSnapshot()
  }, [loadSnapshot])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount，所有 setState 均在 await 之后，非同步
    void loadProfileResolution(selectedProfileSource)
  }, [loadProfileResolution, selectedProfileSource])

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
      await loadProfileResolution(selectedProfileSource)
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
  }, [credentials, loadProfileResolution, loadSnapshot, selectedProfileSource])

  const handleSelectProfileSource = useCallback((nextSource: UserProfileSourceKind) => {
    setLocalDevRefreshState((current) => (current.status === 'error' ? { status: 'idle' } : current))
    savePreferredUserProfileSource(nextSource)
    setSelectedProfileSource(nextSource)
  }, [])

  const handleSelectLocalDevSnapshot = useCallback(() => {
    trySelectLocalDevSnapshot(handleSelectProfileSource)
  }, [handleSelectProfileSource])

  const handleDelete = useCallback(async (clearOverrides: boolean) => {
    setBusy(true)
    try {
      await deleteUserProfileData()
      // 手动能力覆盖与官方存档是两类数据（覆盖是玩家本地手调，不随同步生灭）；
      // 由调用方经弹窗让玩家决定是否一并清除。
      if (clearOverrides) {
        await clearPlannerHeroOverrides()
      }
      setSyncState({ status: 'no-snapshot' })
      await loadProfileResolution(selectedProfileSource)
    } catch {
      setSyncState({ status: 'error', message: '删除失败' })
    } finally {
      setBusy(false)
    }
  }, [loadProfileResolution, selectedProfileSource])

  const handleRefreshLocalDevSnapshot = useCallback(async () => {
    setLocalDevRefreshState({ status: 'loading' })

    try {
      const message = await refreshLocalDevSnapshot()
      if (selectedProfileSource === 'local-dev-snapshot') {
        await loadProfileResolution('local-dev-snapshot')
      }
      setLocalDevRefreshState({ status: 'success', message })
    } catch (error) {
      setLocalDevRefreshState({
        status: 'error',
        message: error instanceof Error
          ? error.message
          : '刷新本地开发快照失败：请检查本机私有凭证、网络或官方接口。',
      })
    }
  }, [loadProfileResolution, selectedProfileSource])

  return {
    syncState,
    busy,
    canSync: Boolean(credentials) && !busy,
    canLoadLocalDevSnapshot: showLocalDevSnapshotAction,
    showLocalDevSnapshotAction,
    profileResolution,
    selectedProfileSource,
    localDevRefreshState,
    handleSync,
    handleSelectProfileSource,
    handleSelectLocalDevSnapshot,
    handleRefreshLocalDevSnapshot,
    handleDelete,
    reload: loadSnapshot,
  }
}
