import type { ReactNode } from 'react'

interface FilterSidebarLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function FilterSidebarLayout({
  sidebar,
  children,
  className,
  contentClassName,
}: FilterSidebarLayoutProps) {
  return (
    <div className={className ? `filter-workspace ${className}` : 'filter-workspace'}>
      <aside className="filter-workspace__sidebar">
        <div className="filter-workspace__sidebar-sticky">{sidebar}</div>
      </aside>
      <div className={contentClassName ? `filter-workspace__content ${contentClassName}` : 'filter-workspace__content'}>
        {children}
      </div>
    </div>
  )
}
