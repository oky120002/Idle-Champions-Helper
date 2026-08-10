import type { UserProfileResolution } from '../../data/user-profile-store'
import type { AppLocale } from '../../app/i18n'

export function getUserHeroProfileSourceLabel(
  profileResolution: UserProfileResolution | null,
  locale: AppLocale,
): string {
  const isZh = locale === 'zh-CN'

  if (profileResolution?.resolvedSource == null) {
    return isZh ? '未同步账号快照' : 'No synced account snapshot'
  }

  if (profileResolution.resolvedSource === 'browser-sync') {
    return isZh ? '浏览器同步快照' : 'Browser sync snapshot'
  }

  return isZh ? '本地开发快照' : 'Local dev snapshot'
}
