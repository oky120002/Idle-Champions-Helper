import {
  ArrowLeft,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react'

export function MobileMenuIcon({ isOpen }: { isOpen: boolean }) {
  const Icon = isOpen ? X : Menu
  return <Icon aria-hidden="true" strokeWidth={1.9} />
}

export function SidebarToggleIcon({ isCollapsed }: { isCollapsed: boolean }) {
  const Icon = isCollapsed ? PanelLeftOpen : PanelLeftClose
  return <Icon aria-hidden="true" strokeWidth={1.8} />
}

export function BackNavigationIcon() {
  return <ArrowLeft aria-hidden="true" strokeWidth={1.9} />
}
