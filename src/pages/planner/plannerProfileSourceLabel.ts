import type { UserProfileSourceKind } from '../../data/user-profile-store'
import type { AppLocale } from '../../app/i18n'

export function formatPlannerProfileSourceLabel(source: UserProfileSourceKind, locale: AppLocale) {
  if (locale === 'zh-CN') {
    return source === 'browser-sync' ? '浏览器同步快照' : '本地开发快照'
  }
  return source === 'browser-sync' ? 'Browser sync snapshot' : 'Local dev snapshot'
}
