import type { LocaleText } from './i18n'

export interface AppNavigationItem {
  to: string
  label: LocaleText
}

export type TranslationFn = (text: LocaleText) => string

export const navigation: AppNavigationItem[] = [
  { to: '/champions', label: { zh: '英雄筛选', en: 'Champions' } },
  { to: '/illustrations', label: { zh: '立绘图鉴', en: 'Illustrations' } },
  { to: '/pets', label: { zh: '宠物图鉴', en: 'Pets' } },
  { to: '/variants', label: { zh: '变体筛选', en: 'Variant filters' } },
  { to: '/formation', label: { zh: '阵型编辑', en: 'Formation' } },
  { to: '/presets', label: { zh: '方案存档', en: 'Presets' } },
  { to: '/user-data', label: { zh: '个人数据', en: 'User Data' } },
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
