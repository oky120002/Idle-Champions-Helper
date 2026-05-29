import type { UserProfileSourceKind } from '../../data/user-profile-store'

export function formatPlannerProfileSourceLabel(source: UserProfileSourceKind) {
  return source === 'browser-sync' ? '浏览器同步快照' : '本地开发快照'
}
