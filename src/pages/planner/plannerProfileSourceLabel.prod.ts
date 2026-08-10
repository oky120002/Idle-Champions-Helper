import type { AppLocale } from '../../app/i18n'
import type { UserProfileSourceKind } from '../../data/user-profile-store'

// ponytail: source is unused in prod (always browser-sync), but must match dev signature
// to avoid positional arg binding mismatch under vite alias replacement.
export function formatPlannerProfileSourceLabel(_source: UserProfileSourceKind, locale: AppLocale): string {
  return locale === 'zh-CN' ? '浏览器同步快照' : 'Browser sync snapshot'
}
