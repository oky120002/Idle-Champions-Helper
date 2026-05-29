import type { UserProfileSourceKind } from '../../data/user-profile-store'

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
