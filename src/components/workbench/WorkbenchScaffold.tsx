import type { CSSProperties, ReactNode } from 'react'
import { useI18n } from '../../app/i18n'

type WorkbenchAccentTone = 'copper' | 'steel'
type WorkbenchBadgeVariant = 'chrome' | 'filter'
type WorkbenchBadgeTone = 'default' | 'muted'
export type WorkbenchShareState = 'idle' | 'success' | 'error'

interface WorkbenchToolbarMarkProps {
  label: string
  accentTone?: WorkbenchAccentTone
  className?: string
}

interface WorkbenchToolbarLeadStatusProps {
  label: string
  status: ReactNode
  statusTitle?: string
  accentTone?: WorkbenchAccentTone
  className?: string
}

interface WorkbenchToolbarFilterStatusProps {
  label: string
  activeCount: number
  accentTone?: WorkbenchAccentTone
  className?: string
}

interface WorkbenchSidebarFilterStatusProps {
  activeCount: number
  className?: string
}

interface WorkbenchToolbarCopyProps {
  kicker: ReactNode
  title: ReactNode
  detail?: ReactNode
  className?: string
}

interface WorkbenchToolbarActionClusterProps {
  children: ReactNode
  className?: string
}

interface WorkbenchToolbarBadgeProps {
  children: ReactNode
  variant?: WorkbenchBadgeVariant
  tone?: WorkbenchBadgeTone
  className?: string
}

interface WorkbenchShareButtonProps {
  state: WorkbenchShareState
  onCopy: () => void | Promise<void>
  className?: string
}

interface WorkbenchSidebarHeaderProps {
  kicker: ReactNode
  title: ReactNode
  description: ReactNode
  status?: ReactNode
  statusLabel?: string
  className?: string
}

interface WorkbenchContentStackProps {
  children: ReactNode
  className?: string
}

interface WorkbenchFilterResultsHeaderProps {
  eyebrow?: string
  title?: ReactNode
  description?: ReactNode
  metrics?: ReactNode
  filterSummary?: ReactNode
  className?: string
}

const ACCENT_TONE_COLOR: Record<WorkbenchAccentTone, string> = {
  copper: 'var(--color-copper)',
  steel: 'var(--color-steel)',
}

function joinClasses(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(' ')
}

export function WorkbenchToolbarMark({
  label,
  accentTone = 'copper',
  className,
}: WorkbenchToolbarMarkProps) {
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
  const status = activeCount > 0
    ? t({ zh: `${activeCount} 项条件`, en: `${activeCount} active` })
    : t({ zh: '条件待命', en: 'Filters idle' })
  const statusTitle = activeCount > 0
    ? t({ zh: `${activeCount} 项筛选条件已启用`, en: `${activeCount} active filters enabled` })
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

export function WorkbenchToolbarCopy({
  kicker,
  title,
  detail,
  className,
}: WorkbenchToolbarCopyProps) {
  return (
    <div className={joinClasses('workbench-page__toolbar-copy', className)}>
      <span className="workbench-page__toolbar-kicker">{kicker}</span>
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

export function WorkbenchSidebarFilterStatus({
  activeCount,
  className,
}: WorkbenchSidebarFilterStatusProps) {
  const { t } = useI18n()

  return (
    <WorkbenchToolbarBadge variant="filter" {...(className !== undefined ? { className } : {})}>
      {activeCount > 0
        ? t({ zh: `${activeCount} 项已启用`, en: `${activeCount} active` })
        : t({ zh: '当前未启用条件', en: 'No active filters' })}
    </WorkbenchToolbarBadge>
  )
}

export function WorkbenchShareButton({
  state,
  onCopy,
  className,
}: WorkbenchShareButtonProps) {
  const { t } = useI18n()
  const label =
    state === 'success'
      ? t({ zh: '已复制链接', en: 'Link copied' })
      : state === 'error'
        ? t({ zh: '复制失败', en: 'Copy failed' })
        : t({ zh: '复制当前链接', en: 'Copy current link' })

  return (
    <button
      type="button"
      className={joinClasses(
        state === 'success'
          ? 'workbench-page__toolbar-action workbench-page__toolbar-action--share workbench-page__toolbar-action--success action-button action-button--ghost action-button--compact action-button--toggled'
          : state === 'error'
            ? 'workbench-page__toolbar-action workbench-page__toolbar-action--share workbench-page__toolbar-action--error action-button action-button--ghost action-button--compact'
            : 'workbench-page__toolbar-action workbench-page__toolbar-action--share action-button action-button--ghost action-button--compact',
        className,
      )}
      onClick={() => {
        void onCopy()
      }}
    >
      {label}
    </button>
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
        <h3 className="workbench-page__sidebar-title">{title}</h3>
        <p className="workbench-page__sidebar-description">{description}</p>
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

export function WorkbenchSidebarLoading({ className }: { className?: string }) {
  return <div className={joinClasses('workbench-page__sidebar-loading', className)} aria-hidden="true" />
}

export function WorkbenchContentStack({
  children,
  className,
}: WorkbenchContentStackProps) {
  return <div className={joinClasses('workbench-page__content-stack', className)}>{children}</div>
}

export function WorkbenchFilterResultsHeader({
  eyebrow,
  title,
  description,
  metrics,
  filterSummary,
  className,
}: WorkbenchFilterResultsHeaderProps) {
  const hasCopy = eyebrow != null || title != null || description != null

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

        {filterSummary !== undefined ? (
          <p className="results-panel__filter-summary workbench-filter-header__filter-summary" aria-live="polite">
            {filterSummary}
          </p>
        ) : null}
      </div>
    </div>
  )
}
