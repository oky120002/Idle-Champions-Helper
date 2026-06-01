import type { UserProfileSourceKind } from '../../data/user-profile-store'

export function canUseLocalDevSnapshotAction(): boolean {
  return false
}

export function trySelectLocalDevSnapshot(
  _selectProfileSource: (source: UserProfileSourceKind) => void,
): boolean {
  return false
}

export async function refreshLocalDevSnapshot(): Promise<string> {
  throw new Error('生产构建不允许刷新本地开发快照。')
}
