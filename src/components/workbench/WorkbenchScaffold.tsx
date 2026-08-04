import type { ReactNode } from 'react'

export type WorkbenchAccentTone = 'copper' | 'steel'
export type WorkbenchBadgeVariant = 'chrome' | 'filter'; export type WorkbenchBadgeTone = 'default' | 'muted'
export type WorkbenchShareState = 'idle' | 'success' | 'error'

interface WorkbenchSidebarHeaderProps {
  readonly kicker: ReactNode
  readonly title?: ReactNode
  readonly description?: ReactNode
  readonly status?: ReactNode
  readonly statusLabel?: string
  readonly className?: string
}

interface WorkbenchContentStackProps {
  readonly children: ReactNode
  readonly className?: string
}

interface WorkbenchFilterResultsHeaderProps {
  readonly eyebrow?: string
  readonly title?: ReactNode
  readonly description?: ReactNode
  readonly metrics?: ReactNode
  readonly filterSummary?: ReactNode
  readonly reserveFilterSummarySpace?: boolean
  readonly className?: string
}

function joinClasses(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(' ')
}

function hasNode(node: ReactNode | undefined): boolean {
  return node !== undefined && node !== null
}

export function WorkbenchSidebarHeader({
  kicker,
  title,
  description,
  status,
  statusLabel,
  className,
}: WorkbenchSidebarHeaderProps) {
  return (
    <div className={joinClasses('workbench-page__sidebar-header', className)}>
      <div className="workbench-page__sidebar-copy">
        <p className="workbench-page__sidebar-kicker">{kicker}</p>
        {hasNode(title) ? <h3 className="workbench-page__sidebar-title">{title}</h3> : null}
        {hasNode(description) ? <p className="workbench-page__sidebar-description">{description}</p> : null}
      </div>
      {hasNode(status) ? (
        <div
          className="workbench-page__sidebar-status"
          role="group"
          aria-label={statusLabel}
        >
          {status}
        </div>
      ) : null}
    </div>
  )
}

export function WorkbenchSidebarLoading({ className }: { readonly className?: string }) {
  return <div className={joinClasses('workbench-page__sidebar-loading', className)} aria-hidden="true" />
}

export function WorkbenchContentStack({
  children,
  className,
}: WorkbenchContentStackProps) {
  return <div className={joinClasses('workbench-page__content-stack', className)}>{children}</div>
}

function renderFilterSummary(filterSummary: ReactNode | undefined, reserveFilterSummarySpace: boolean): ReactNode {
  if (filterSummary === undefined && !reserveFilterSummarySpace) {
    return null
  }

  const ariaProps = filterSummary !== undefined ? { 'aria-live': 'polite' as const } : { 'aria-hidden': true }

  return (
    <p
      className="results-panel__filter-summary workbench-filter-header__filter-summary"
      {...ariaProps}
      data-empty={filterSummary === undefined ? 'true' : undefined}
    >
      {filterSummary ?? ' '}
    </p>
  )
}

export function WorkbenchFilterResultsHeader({
  eyebrow, title, description, metrics, filterSummary, reserveFilterSummarySpace = false, className,
}: WorkbenchFilterResultsHeaderProps) {
  const hasCopy = hasNode(eyebrow) || hasNode(title) || hasNode(description)

  return (
    <div
      className={joinClasses(
        'workbench-filter-header',
        'page-tab-header',
        !hasCopy && 'workbench-filter-header--metrics-only',
        className,
      )}
    >
      <div className="workbench-filter-header__summary">
        <div className="workbench-filter-header__titlebar">
          {hasCopy ? (
            <div className="workbench-filter-header__copy">
              {hasNode(eyebrow) ? (
                <p className="page-tab-header__eyebrow page-tab-header__eyebrow--accent-only workbench-filter-header__kicker">
                  <span className="page-tab-header__eyebrow-accent">{eyebrow}</span>
                </p>
              ) : null}
              {hasNode(title) ? <h2 className="workbench-filter-header__title">{title}</h2> : null}
              {hasNode(description) ? (
                <p className="supporting-text workbench-filter-header__description">{description}</p>
              ) : null}
            </div>
          ) : null}

          {hasNode(metrics) ? (
            <div className="workbench-filter-header__metrics">{metrics}</div>
          ) : null}
        </div>

        {renderFilterSummary(filterSummary, reserveFilterSummarySpace)}
      </div>
    </div>
  )
}
