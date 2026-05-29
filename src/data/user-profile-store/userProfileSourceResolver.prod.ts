import { readUserProfileSnapshot } from './userProfileStore'
import type {
  UserProfileResolution,
  UserProfileSourceKind,
} from './userProfileSourceResolver'

export const USER_PROFILE_SOURCE_PREFERENCE_STORAGE_KEY = 'idle-champions-helper.user-profile-source'

export function isLocalDevUserProfileSourceEnabled(): boolean {
  return false
}

export function readPreferredUserProfileSource(): UserProfileSourceKind {
  return 'browser-sync'
}

export function savePreferredUserProfileSource(_source: UserProfileSourceKind): void {
  // Production builds must never persist or honor a local-dev user profile source.
}

export async function resolveUserProfileSnapshot(): Promise<UserProfileResolution> {
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
