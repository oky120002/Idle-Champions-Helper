import type { UserProfileSourceKind } from '../../data/user-profile-store'

export function canUseLocalDevSnapshotAction(): boolean {
  return false
}

export function trySelectLocalDevSnapshot(
  _selectProfileSource: (source: UserProfileSourceKind) => void,
): boolean {
  return false
}
