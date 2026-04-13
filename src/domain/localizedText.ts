import type { AppLocale } from '../app/i18n'
import type { LocalizedText } from './types'

export function matchesLocalizedText(value: LocalizedText, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return [value.display, value.original].some((item) => item.toLowerCase().includes(normalizedQuery))
}

export function getLocalizedOriginal(value: LocalizedText): string | null {
  return value.display === value.original ? null : value.original
}

export function getPrimaryLocalizedText(value: LocalizedText, locale: AppLocale): string {
  return locale === 'zh-CN' ? value.display : value.original
}

export function getSecondaryLocalizedText(value: LocalizedText, locale: AppLocale): string | null {
  const primary = getPrimaryLocalizedText(value, locale)
  const secondary = locale === 'zh-CN' ? value.original : value.display

  return primary === secondary ? null : secondary
}

const ROLE_LABELS: Record<string, { 'zh-CN': string; 'en-US': string }> = {
  breaking: {
    'zh-CN': '破阵',
    'en-US': 'Breaking',
  },
  control: {
    'zh-CN': '控制',
    'en-US': 'Control',
  },
  debuff: {
    'zh-CN': '减益',
    'en-US': 'Debuff',
  },
  dps: {
    'zh-CN': '输出',
    'en-US': 'DPS',
  },
  gold: {
    'zh-CN': '金币',
    'en-US': 'Gold',
  },
  healing: {
    'zh-CN': '治疗',
    'en-US': 'Healing',
  },
  speed: {
    'zh-CN': '速度',
    'en-US': 'Speed',
  },
  support: {
    'zh-CN': '辅助',
    'en-US': 'Support',
  },
  tank: {
    'zh-CN': '坦克',
    'en-US': 'Tank',
  },
  tanking: {
    'zh-CN': '坦克',
    'en-US': 'Tanking',
  },
}

export function getRoleLabel(role: string, locale: AppLocale): string {
  return ROLE_LABELS[role]?.[locale] ?? role
}
