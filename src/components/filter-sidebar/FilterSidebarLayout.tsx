import type { CSSProperties, ReactNode } from 'react'

interface FilterSidebarLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  style?: CSSProperties
}

export function FilterSidebarLayout({
  sidebar,
  children,
  className,
  contentClassName,
  style,
}: FilterSidebarLayoutProps) {
  return (
    <div className={className ? `filter-workspace ${className}` : 'filter-workspace'} style={style}>
      <aside className="filter-workspace__sidebar">
        <div className="filter-workspace__sidebar-sticky">{sidebar}</div>
      </aside>
      <div className={contentClassName ? `filter-workspace__content ${contentClassName}` : 'filter-workspace__content'}>
        {children}
      </div>
    </div>
  )
}
