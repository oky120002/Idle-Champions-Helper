import type { ReactNode } from 'react'

interface FilterSidebarPanelProps {
  title: ReactNode
  children: ReactNode
  description?: ReactNode
  status?: ReactNode
  statusAriaLabel?: string
  note?: ReactNode
  ariaLabel?: string
  className?: string
  titleAs?: 'h2' | 'h3'
}

export function FilterSidebarPanel({
  title,
  children,
  description,
  status,
  statusAriaLabel,
  note,
  ariaLabel,
  className,
  titleAs = 'h2',
}: FilterSidebarPanelProps) {
  const TitleTag = titleAs

  return (
    <section
      className={className ? `filter-sidebar-panel ${className}` : 'filter-sidebar-panel'}
      aria-label={ariaLabel}
    >
      <div className="filter-sidebar-panel__header">
        <div className="filter-sidebar-panel__copy">
          <TitleTag className="section-heading filter-sidebar-panel__title">{title}</TitleTag>
          {description !== undefined ? <p className="filter-sidebar-panel__description">{description}</p> : null}
        </div>
        {status !== undefined ? (
          <div
            className="filter-sidebar-panel__status"
            role={statusAriaLabel ? 'group' : undefined}
            aria-label={statusAriaLabel}
          >
            {status}
          </div>
        ) : null}
      </div>
      {note !== undefined ? <p className="filter-sidebar-panel__note">{note}</p> : null}
      <div className="filter-sidebar-panel__content">{children}</div>
    </section>
  )
}
