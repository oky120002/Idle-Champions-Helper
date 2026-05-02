import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  BrainCircuit,
  Database,
  GitBranch,
  Image,
  LayoutGrid,
  PawPrint,
  Users,
} from 'lucide-react'
import type { LocaleText } from './i18n'

export interface AppNavigationItem {
  to: string
  label: LocaleText
  Icon: LucideIcon
}

export type TranslationFn = (text: LocaleText) => string

export const navigation: AppNavigationItem[] = [
  { to: '/champions', label: { zh: '英雄筛选', en: 'Champions' }, Icon: Users },
  { to: '/illustrations', label: { zh: '立绘图鉴', en: 'Illustrations' }, Icon: Image },
  { to: '/pets', label: { zh: '宠物图鉴', en: 'Pets' }, Icon: PawPrint },
  { to: '/variants', label: { zh: '变体筛选', en: 'Variant filters' }, Icon: GitBranch },
  { to: '/formation', label: { zh: '阵型编辑', en: 'Formation' }, Icon: LayoutGrid },
  { to: '/presets', label: { zh: '方案存档', en: 'Presets' }, Icon: Archive },
  { to: '/planner', label: { zh: '自动计划', en: 'Automatic Planner' }, Icon: BrainCircuit },
  { to: '/user-data', label: { zh: '个人数据', en: 'User Data' }, Icon: Database },
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

function findNavigationItemByTo(to: string | null): AppNavigationItem | null {
  if (!to) {
    return null
  }

  return navigation.find((item) => item.to === to) ?? null
}

function isNavigationLocationState(value: unknown): value is {
  activeNavigationTo?: string
  returnTo?: {
    pathname?: string
  }
} {
  return typeof value === 'object' && value !== null
}

function resolveNavigationSourceTo(state: unknown): string | null {
  if (!isNavigationLocationState(state)) {
    return null
  }

  if (typeof state.activeNavigationTo === 'string') {
    return state.activeNavigationTo
  }

  if (typeof state.returnTo?.pathname === 'string') {
    return state.returnTo.pathname
  }

  return null
}

export function resolveActiveNavigationItem(pathname: string, state: unknown): AppNavigationItem {
  const fallbackNavigationItem = navigation[0]

  if (!fallbackNavigationItem) {
    throw new Error('Site navigation requires at least one navigation item.')
  }

  const explicitSourceNavigationItem = findNavigationItemByTo(resolveNavigationSourceTo(state))

  if (explicitSourceNavigationItem && pathname.startsWith('/champions/')) {
    return explicitSourceNavigationItem
  }

  return navigation.find((item) => isNavigationItemActive(pathname, item.to)) ?? explicitSourceNavigationItem ?? fallbackNavigationItem
}
