import type { UserProfileSourceKind } from '../../data/user-profile-store'
import { refreshLocalDevPrivateSnapshot } from '../../data/user-sync/localDevPrivateSnapshot'

export function canUseLocalDevSnapshotAction(): boolean {
  return import.meta.env.DEV
}

export function trySelectLocalDevSnapshot(
  selectProfileSource: (source: UserProfileSourceKind) => void,
): boolean {
  if (!import.meta.env.DEV) {
    return false
  }

  selectProfileSource('local-dev-snapshot')
  return true
}

export async function refreshLocalDevSnapshot(): Promise<string> {
  if (!import.meta.env.DEV) {
    throw new Error('本地开发快照刷新只允许在 Vite 开发模式中使用。')
  }

  return refreshLocalDevPrivateSnapshot()
}
