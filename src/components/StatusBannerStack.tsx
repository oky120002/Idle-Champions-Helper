import type { ReactNode } from 'react'
import { StatusBanner, type StatusTone } from './StatusBanner'

export interface StatusBannerStackItem {
  id: string
  tone: StatusTone
  title?: ReactNode
  detail?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  hidden?: boolean
}

interface StatusBannerStackProps {
  items: StatusBannerStackItem[]
}

export function StatusBannerStack({ items }: StatusBannerStackProps) {
  const visibleItems = items.filter((item) => !item.hidden)

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <>
      {visibleItems.map((item) => (
        <StatusBanner
          key={item.id}
          tone={item.tone}
          {...(item.title !== undefined ? { title: item.title } : {})}
          {...(item.detail !== undefined ? { detail: item.detail } : {})}
          {...(item.meta !== undefined ? { meta: item.meta } : {})}
          {...(item.actions !== undefined ? { actions: item.actions } : {})}
        >
          {item.children}
        </StatusBanner>
      ))}
    </>
  )
}
