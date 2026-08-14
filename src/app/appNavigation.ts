import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  BrainCircuit,
  Database,
  GitBranch,
  Image,
  LayoutGrid,
  PawPrint,
  Search,
  User,
  Users,
} from 'lucide-react'
import type { MessageRef, TranslateParams } from './i18n'

export interface AppNavigationItem {
  to: string
  label: MessageRef
  Icon: LucideIcon
}

export type TranslationFn = (
  text: string | MessageRef,
  params?: TranslateParams,
) => string

export const navigation: AppNavigationItem[] = [
  { to: '/champions', label: { key: '英雄筛选' }, Icon: Users },
  { to: '/search', label: { key: '全文搜索' }, Icon: Search },
  { to: '/user-heroes', label: { key: '用户英雄' }, Icon: User },
  { to: '/illustrations', label: { key: '立绘图鉴' }, Icon: Image },
  { to: '/pets', label: { key: '宠物图鉴' }, Icon: PawPrint },
  { to: '/variants', label: { key: '变体筛选' }, Icon: GitBranch },
  { to: '/formation', label: { key: '阵型编辑' }, Icon: LayoutGrid },
  { to: '/presets', label: { key: '方案存档' }, Icon: Archive },
  { to: '/planner', label: { key: '自动计划' }, Icon: BrainCircuit },
  { to: '/user-data', label: { key: '个人数据' }, Icon: Database },
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
  if (to == null || to === '') {
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
