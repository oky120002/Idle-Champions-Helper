import type { UserProfileResolution } from '../../data/user-profile-store'

export function getUserHeroProfileSourceLabel(profileResolution: UserProfileResolution | null): string {
  if (profileResolution?.resolvedSource == null) {
    return '未同步账号快照'
  }

  return profileResolution.resolvedSource === 'browser-sync'
    ? '浏览器同步快照'
    : '本地开发快照'
}
