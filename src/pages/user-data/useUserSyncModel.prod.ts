import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteUserProfileData,
  resolveUserProfileSnapshot,
  readUserProfileSnapshot,
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

export type SyncState =
  | { status: 'no-snapshot' }
  | { status: 'loaded'; snapshot: UserProfileSnapshot; ageDays: number }
  | { status: 'error'; message: string }

export type LocalDevRefreshState = { status: 'idle' }

export function useUserSyncModel(credentials: UserCredentials | null = null) {
  const [syncState, setSyncState] = useState<SyncState>({ status: 'no-snapshot' })
  const [busy, setBusy] = useState(false)
  const [profileResolution, setProfileResolution] = useState<UserProfileResolution>({
    selectedSource: 'browser-sync',
    resolvedSource: null,
    snapshot: null,
    errorMessage: null,
    persisted: true,
  })

  // syncState 写入令牌 + resolution 请求版本：与 dev 版（useUserSyncModel.ts）同构，丢弃过时 async 结果，
  // 消除 mount 的慢 async 覆盖用户操作结果的竞态（详见 dev 版注释）。
  const syncWriteToken = useRef(0)
  const loadSnapshot = useCallback(async () => {
    const token = syncWriteToken.current
    try {
      const snapshot = await readUserProfileSnapshot()
      if (syncWriteToken.current !== token) {
        return
      }
      if (!snapshot) {
        setSyncState({ status: 'no-snapshot' })
        return
      }

      const ageMs = Date.now() - new Date(snapshot.updatedAt).getTime()
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))
      setSyncState({ status: 'loaded', snapshot, ageDays })
    } catch {
      if (syncWriteToken.current !== token) {
        return
      }
      setSyncState({ status: 'error', message: '读取本地数据失败' })
    }
  }, [])

  const resolveRequestId = useRef(0)
  const loadProfileResolution = useCallback(async () => {
    const requestId = ++resolveRequestId.current
    const resolution = await resolveUserProfileSnapshot()
    if (resolveRequestId.current !== requestId) {
      return
    }
    setProfileResolution(resolution)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount，所有 setState 均在 await 之后，非同步
    void loadSnapshot()
  }, [loadSnapshot])

  useEffect(() => {
    // fetch-on-mount：setState 在 await + 竞态守卫之后，非 effect 内同步 set。
    void loadProfileResolution()
  }, [loadProfileResolution])

  const handleSync = useCallback(async () => {
    if (!credentials) {
      setSyncState({ status: 'error', message: '请先读取并校验凭证，再手动同步。' })
      return
    }

    syncWriteToken.current += 1
    setBusy(true)
    try {
      const payloads = await fetchUserProfilePayloads(credentials)
      const snapshot = buildUserProfileSnapshot(payloads)
      await saveUserProfileSnapshot(snapshot)
      await loadSnapshot()
      await loadProfileResolution()
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
  }, [credentials, loadProfileResolution, loadSnapshot])

  const handleDelete = useCallback(async (clearOverrides: boolean) => {
    syncWriteToken.current += 1
    setBusy(true)
    try {
      await deleteUserProfileData()
      if (clearOverrides) {
        await clearPlannerHeroOverrides()
      }
      setSyncState({ status: 'no-snapshot' })
      await loadProfileResolution()
    } catch {
      setSyncState({ status: 'error', message: '删除失败' })
    } finally {
      setBusy(false)
    }
  }, [loadProfileResolution])

  return {
    canSync: Boolean(credentials) && !busy,
    canLoadLocalDevSnapshot: false,
    showLocalDevSnapshotAction: false,
    selectedProfileSource: 'browser-sync' as UserProfileSourceKind,
    localDevRefreshState: { status: 'idle' } as LocalDevRefreshState,
    handleSelectProfileSource: (_nextSource: UserProfileSourceKind) => {},
    handleSelectLocalDevSnapshot: () => {},
    handleRefreshLocalDevSnapshot: async () => {},
    reload: loadSnapshot,
    syncState,
    busy,
    profileResolution,
    handleSync,
    handleDelete,
  }
}
