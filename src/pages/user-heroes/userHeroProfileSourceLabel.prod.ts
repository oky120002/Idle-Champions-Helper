import type { AppLocale } from '../../app/i18n'
import type { UserProfileResolution } from '../../data/user-profile-store'

// Prod only has browser-sync (no local-dev); profileResolution null check preserved.
export function getUserHeroProfileSourceLabel(
  profileResolution: UserProfileResolution | null,
  locale: AppLocale,
): string {
  const isZh = locale === 'zh-CN'
  if (profileResolution?.resolvedSource == null) {
    return isZh ? '未同步账号快照' : 'No synced account snapshot'
  }
  return isZh ? '浏览器同步快照' : 'Browser sync snapshot'
}
