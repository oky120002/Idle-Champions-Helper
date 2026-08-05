import {
  CornerUpLeft,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react'

export function MobileMenuIcon({ isOpen }: { readonly isOpen: boolean }) {
  const Icon = isOpen ? X : Menu
  return <Icon aria-hidden="true" strokeWidth={1.9} />
}

export function SidebarToggleIcon({ isCollapsed }: { readonly isCollapsed: boolean }) {
  const Icon = isCollapsed ? PanelLeftOpen : PanelLeftClose
  return <Icon aria-hidden="true" strokeWidth={1.8} />
}

export function BackNavigationIcon() {
  return <CornerUpLeft aria-hidden="true" strokeWidth={1.9} />
}
