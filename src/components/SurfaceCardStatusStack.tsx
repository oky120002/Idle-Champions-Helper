import { SurfaceCard } from './SurfaceCard'
import { StatusBannerStack, type StatusBannerStackItem } from './StatusBannerStack'

export interface SurfaceCardStatusStackItem {
  id: string
  eyebrow?: string
  title?: string
  description?: string
  statusItems: StatusBannerStackItem[]
  hidden?: boolean
}

interface SurfaceCardStatusStackProps {
  items: SurfaceCardStatusStackItem[]
}

function hasVisibleStatusItems(item: SurfaceCardStatusStackItem): boolean {
  return item.statusItems.some((statusItem) => !statusItem.hidden)
}

export function SurfaceCardStatusStack({ items }: SurfaceCardStatusStackProps) {
  const visibleItems = items.filter((item) => !item.hidden && hasVisibleStatusItems(item))

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <>
      {visibleItems.map((item) => (
        <SurfaceCard
          key={item.id}
          {...(item.eyebrow !== undefined ? { eyebrow: item.eyebrow } : {})}
          {...(item.title !== undefined ? { title: item.title } : {})}
          {...(item.description !== undefined ? { description: item.description } : {})}
        >
          <StatusBannerStack items={item.statusItems} />
        </SurfaceCard>
      ))}
    </>
  )
}
