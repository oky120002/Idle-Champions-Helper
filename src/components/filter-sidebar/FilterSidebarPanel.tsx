import type { ReactNode } from 'react'

interface FilterSidebarPanelProps {
  title: ReactNode
  children: ReactNode
  description?: ReactNode
  titleTrailing?: ReactNode
  status?: ReactNode
  statusLabel?: string
  note?: ReactNode
  ariaLabel?: string
  className?: string
  titleAs?: 'h2' | 'h3'
}

export function FilterSidebarPanel({
  title,
  children,
  description,
  titleTrailing,
  status,
  statusLabel,
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
          <div className="filter-sidebar-panel__title-row">
            <TitleTag className="section-heading filter-sidebar-panel__title">{title}</TitleTag>
            {titleTrailing !== undefined ? (
              <div className="filter-sidebar-panel__title-trailing">{titleTrailing}</div>
            ) : null}
          </div>
          {description !== undefined ? <p className="filter-sidebar-panel__description">{description}</p> : null}
        </div>
        {status !== undefined ? (
          <div
            className="filter-sidebar-panel__status"
            role={statusLabel ? 'group' : undefined}
            aria-label={statusLabel}
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
