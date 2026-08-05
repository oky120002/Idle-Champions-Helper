import type { UserProfileResolution } from '../../data/user-profile-store'

export function getUserHeroProfileSourceLabel(profileResolution: UserProfileResolution | null): string {
  if (profileResolution?.resolvedSource == null) {
    return '未同步账号快照'
  }

  return '浏览器同步快照'
}
