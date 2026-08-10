import type { AppLocale } from '../../app/i18n'

export function formatPlannerProfileSourceLabel(locale: AppLocale): string {
  return locale === 'zh-CN' ? '浏览器同步快照' : 'Browser sync snapshot'
}
