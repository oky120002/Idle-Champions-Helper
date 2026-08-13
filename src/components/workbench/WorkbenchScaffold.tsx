/* eslint-disable max-lines -- 内聚的 workbench 呈现组件集合，拆分会增加跨文件跳转 */
import type { CSSProperties, ReactNode } from 'react'
import { useI18n } from '../../app/i18n'

export type WorkbenchAccentTone = 'copper' | 'steel'
export type WorkbenchBadgeVariant = 'chrome' | 'filter'; export type WorkbenchBadgeTone = 'default' | 'muted'
export type WorkbenchShareState = 'idle' | 'success' | 'error'

interface WorkbenchToolbarMarkProps {
  readonly label: string
  readonly accentTone?: WorkbenchAccentTone
  readonly className?: string
}

interface WorkbenchToolbarLeadStatusProps {
  readonly label: string
  readonly status: ReactNode
  readonly statusTitle?: string
  readonly accentTone?: WorkbenchAccentTone
  readonly className?: string
}

interface WorkbenchToolbarFilterStatusProps {
  readonly label: string
  readonly activeCount: number
  readonly accentTone?: WorkbenchAccentTone
  readonly className?: string
}

interface WorkbenchToolbarCopyProps {
  readonly kicker?: ReactNode
  readonly title: ReactNode
  readonly detail?: ReactNode
  readonly className?: string
}

interface WorkbenchToolbarActionClusterProps {
  readonly children: ReactNode
  readonly className?: string
}

interface WorkbenchToolbarBadgeProps {
  readonly children: ReactNode
  readonly variant?: WorkbenchBadgeVariant
  readonly tone?: WorkbenchBadgeTone
  readonly className?: string
}

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

const ACCENT_TONE_COLOR: Record<WorkbenchAccentTone, string> = {
  copper: 'var(--color-copper)',
  steel: 'var(--color-steel)',
}

function joinClasses(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(' ')
}

export function WorkbenchToolbarMark({ label, accentTone = 'copper', className }: WorkbenchToolbarMarkProps) {
  return (
    <div
      className={joinClasses('workbench-page__toolbar-mark', className)}
      style={{ '--workbench-page-accent': ACCENT_TONE_COLOR[accentTone] } as CSSProperties}
      aria-hidden="true"
    >
      <span className="workbench-page__toolbar-mark-dot" />
      <span className="workbench-page__toolbar-mark-label">{label}</span>
    </div>
  )
}

export function WorkbenchToolbarLeadStatus({
  label,
  status,
  statusTitle,
  accentTone = 'copper',
  className,
}: WorkbenchToolbarLeadStatusProps) {
  return (
    <div className={joinClasses('workbench-page__toolbar-lead-status-group', className)}>
      <WorkbenchToolbarMark
        label={label}
        accentTone={accentTone}
        className="workbench-page__toolbar-lead-status-mark"
      />
      <span
        className="workbench-page__toolbar-lead-status"
        aria-live="polite"
        title={statusTitle}
      >
        {status}
      </span>
    </div>
  )
}

export function WorkbenchToolbarFilterStatus({
  label,
  activeCount,
  accentTone = 'copper',
  className,
}: WorkbenchToolbarFilterStatusProps) {
  const { t } = useI18n()
  const countText = String(activeCount)
  const status = activeCount > 0
    ? t("{p0} 项条件", { p0: countText })
    : t("条件待命")
  const statusTitle = activeCount > 0
    ? t("{p0} 项筛选条件已启用", { p0: countText })
    : status

  return (
    <WorkbenchToolbarLeadStatus
      label={label}
      status={status}
      statusTitle={statusTitle}
      accentTone={accentTone}
      {...(className !== undefined ? { className } : {})}
    />
  )
}

export function WorkbenchToolbarCopy({ kicker, title, detail, className }: WorkbenchToolbarCopyProps) {
  return (
    <div className={joinClasses('workbench-page__toolbar-copy', className)}>
      {kicker != null ? <span className="workbench-page__toolbar-kicker">{kicker}</span> : null}
      <strong className="workbench-page__toolbar-title">{title}</strong>
      {detail != null ? <span className="workbench-page__toolbar-detail">{detail}</span> : null}
    </div>
  )
}

export function WorkbenchToolbarActionCluster({
  children,
  className,
}: WorkbenchToolbarActionClusterProps) {
  return <div className={joinClasses('workbench-page__toolbar-action-cluster', className)}>{children}</div>
}

export function WorkbenchToolbarBadge({
  children,
  variant = 'chrome',
  tone = 'default',
  className,
}: WorkbenchToolbarBadgeProps) {
  return (
    <span
      className={joinClasses(
        'workbench-page__toolbar-badge',
        variant === 'filter' ? 'filter-sidebar-panel__badge' : '',
        tone === 'muted' ? 'workbench-page__toolbar-badge--muted' : '',
        className,
      )}
    >
      {children}
    </span>
  )
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
        {title != null ? <h3 className="workbench-page__sidebar-title">{title}</h3> : null}
        {description != null ? <p className="workbench-page__sidebar-description">{description}</p> : null}
      </div>
      {status != null ? (
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

export function WorkbenchFilterResultsHeader({
  eyebrow, title, description, metrics, filterSummary, reserveFilterSummarySpace = false, className,
}: WorkbenchFilterResultsHeaderProps) {
  const hasCopy = eyebrow != null || title != null || description != null
  const summaryAriaProps = filterSummary !== undefined
    ? { 'aria-live': 'polite' as const }
    : { 'aria-hidden': true as const }

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
              {eyebrow != null ? (
                <p className="page-tab-header__eyebrow page-tab-header__eyebrow--accent-only workbench-filter-header__kicker">
                  <span className="page-tab-header__eyebrow-accent">{eyebrow}</span>
                </p>
              ) : null}
              {title != null ? <h2 className="workbench-filter-header__title">{title}</h2> : null}
              {description != null ? (
                <p className="supporting-text workbench-filter-header__description">{description}</p>
              ) : null}
            </div>
          ) : null}

          {metrics != null ? (
            <div className="workbench-filter-header__metrics">{metrics}</div>
          ) : null}
        </div>

        {filterSummary !== undefined || reserveFilterSummarySpace ? (
          <p
            className="results-panel__filter-summary workbench-filter-header__filter-summary"
            {...summaryAriaProps}
            data-empty={filterSummary === undefined ? 'true' : undefined}
          >
            {filterSummary ?? '\u00A0'}
          </p>
        ) : null}
      </div>
    </div>
  )
}
