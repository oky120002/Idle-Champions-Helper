import type { AppLocale, LocaleText } from './i18n'

export interface AppNavigationItem {
  to: string
  label: LocaleText
}

export interface LocaleOption {
  id: AppLocale
  shortLabel: string
  title: string
}

export type TranslationFn = (text: LocaleText) => string

export const navigation: AppNavigationItem[] = [
  { to: '/', label: { zh: '总览', en: 'Overview' } },
  { to: '/champions', label: { zh: '英雄筛选', en: 'Champions' } },
  { to: '/illustrations', label: { zh: '立绘页', en: 'Illustrations' } },
  { to: '/pets', label: { zh: '宠物图鉴', en: 'Pets' } },
  { to: '/variants', label: { zh: '变体筛选', en: 'Variant filters' } },
  { to: '/formation', label: { zh: '阵型编辑', en: 'Formation' } },
  { to: '/presets', label: { zh: '方案存档', en: 'Presets' } },
  { to: '/user-data', label: { zh: '个人数据', en: 'User Data' } },
]

export const localeOptions: LocaleOption[] = [
  { id: 'zh-CN', shortLabel: '中', title: '中文' },
  { id: 'en-US', shortLabel: 'EN', title: 'English' },
]

export function getNavClassName(isActive: boolean): string {
  return isActive ? 'nav-link nav-link--active' : 'nav-link'
}

export function isNavigationItemActive(pathname: string, to: string): boolean {
  if (to === '/') {
    return pathname === '/'
  }

  return pathname === to || pathname.startsWith(`${to}/`)
}
