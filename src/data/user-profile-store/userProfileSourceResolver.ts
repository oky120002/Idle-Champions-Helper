import type { UserProfileSnapshot } from '../../domain/user-profile/types'
import { buildUserProfileSnapshot } from '../user-sync/userProfileNormalizer'
import { readUserProfileSnapshot } from './userProfileStore'

export type UserProfileSourceKind = 'browser-sync' | 'local-dev-snapshot'

export interface UserProfileResolution {
  selectedSource: UserProfileSourceKind
  resolvedSource: UserProfileSourceKind | null
  snapshot: UserProfileSnapshot | null
  errorMessage: string | null
  persisted: boolean
}

export const USER_PROFILE_SOURCE_PREFERENCE_STORAGE_KEY = 'idle-champions-helper.user-profile-source'

const DEFAULT_SOURCE: UserProfileSourceKind = 'browser-sync'
const LOCAL_DEV_SOURCE_ERROR_MESSAGE = '读取本地开发快照失败：请先准备本地私有快照，并确认当前处于 Vite 开发环境。'

function isUserProfileSourceKind(value: unknown): value is UserProfileSourceKind {
  return value === 'browser-sync' || value === 'local-dev-snapshot'
}

function canUseLocalStorage(storage: Storage | null): storage is Storage {
  return Boolean(storage)
}

function readBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function isLocalDevUserProfileSourceEnabled(): boolean {
  return import.meta.env.DEV
}

export function readPreferredUserProfileSource(storage: Storage | null = readBrowserStorage()): UserProfileSourceKind {
  if (!isLocalDevUserProfileSourceEnabled() || !canUseLocalStorage(storage)) {
    return DEFAULT_SOURCE
  }

  const stored = storage.getItem(USER_PROFILE_SOURCE_PREFERENCE_STORAGE_KEY)
  return isUserProfileSourceKind(stored) ? stored : DEFAULT_SOURCE
}

export function savePreferredUserProfileSource(
  source: UserProfileSourceKind,
  storage: Storage | null = readBrowserStorage(),
): void {
  if (!isLocalDevUserProfileSourceEnabled() || !canUseLocalStorage(storage)) {
    return
  }

  storage.setItem(USER_PROFILE_SOURCE_PREFERENCE_STORAGE_KEY, source)
}

async function readLocalDevUserProfileSnapshot(): Promise<UserProfileSnapshot> {
  if (!isLocalDevUserProfileSourceEnabled()) {
    throw new Error('本地开发快照只允许在 Vite 开发模式中使用。')
  }

  try {
    const module = await import('../user-sync/localDevPrivateSnapshot')
    const payloads = await module.fetchLocalDevPrivateSnapshotPayloads()
    return buildUserProfileSnapshot(payloads)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }

    throw new Error(LOCAL_DEV_SOURCE_ERROR_MESSAGE, { cause: error })
  }
}

async function resolveBrowserSyncSnapshot(): Promise<UserProfileResolution> {
  try {
    const snapshot = await readUserProfileSnapshot()
    return {
      selectedSource: 'browser-sync',
      resolvedSource: snapshot ? 'browser-sync' : null,
      snapshot,
      errorMessage: null,
      persisted: true,
    }
  } catch (error) {
    return {
      selectedSource: 'browser-sync',
      resolvedSource: null,
      snapshot: null,
      errorMessage: error instanceof Error ? error.message : '读取浏览器同步快照失败。',
      persisted: true,
    }
  }
}

async function resolveLocalDevSnapshot(): Promise<UserProfileResolution> {
  try {
    const snapshot = await readLocalDevUserProfileSnapshot()
    return {
      selectedSource: 'local-dev-snapshot',
      resolvedSource: 'local-dev-snapshot',
      snapshot,
      errorMessage: null,
      persisted: false,
    }
  } catch (error) {
    return {
      selectedSource: 'local-dev-snapshot',
      resolvedSource: null,
      snapshot: null,
      errorMessage: error instanceof Error ? error.message : LOCAL_DEV_SOURCE_ERROR_MESSAGE,
      persisted: false,
    }
  }
}

export async function resolveUserProfileSnapshot(
  preferredSource: UserProfileSourceKind = readPreferredUserProfileSource(),
): Promise<UserProfileResolution> {
  if (!isLocalDevUserProfileSourceEnabled()) {
    return resolveBrowserSyncSnapshot()
  }

  if (preferredSource === 'local-dev-snapshot') {
    return resolveLocalDevSnapshot()
  }

  return resolveBrowserSyncSnapshot()
}
