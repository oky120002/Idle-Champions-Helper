import type { AppLocale } from '../../app/i18n'

export function toTitleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function isAcquisitionTag(tag: string): boolean {
  return ['cneoriginal', 'core', 'event', 'evergreen', 'starter', 'tales'].includes(tag) || /^y\d+$/i.test(tag)
}

export function isMechanicTag(tag: string): boolean {
  return tag === 'positional' || tag.startsWith('control_') || tag.startsWith('spec_')
}

export function buildFallbackTagLabel(tag: string, locale: AppLocale): string {
  if (/^y\d+$/i.test(tag)) {
    const year = tag.slice(1)
    return locale === 'zh-CN' ? `第 ${year} 年活动` : `Year ${year}`
  }

  return locale === 'zh-CN' ? tag.replaceAll('_', ' ') : toTitleCase(tag)
}
