import type { ReactNode } from 'react'

interface FilterSidebarToolbarProps {
  title: ReactNode
  description?: ReactNode
  status?: ReactNode
  actions?: ReactNode
}

export function FilterSidebarToolbar({ title, description, status, actions }: FilterSidebarToolbarProps) {
  return (
    <div className="filter-sidebar-toolbar">
      <div className="filter-sidebar-toolbar__meta">
        <strong className="filter-sidebar-toolbar__title">{title}</strong>
        {description !== undefined ? <span className="filter-sidebar-toolbar__description">{description}</span> : null}
      </div>
      {status !== undefined || actions !== undefined ? (
        <div className="filter-sidebar-toolbar__status">
          {status !== undefined ? <div className="filter-sidebar-toolbar__badges">{status}</div> : null}
          {actions !== undefined ? <div className="filter-sidebar-toolbar__actions">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  )
}
