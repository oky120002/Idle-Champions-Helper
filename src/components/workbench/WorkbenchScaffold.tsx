import type { CSSProperties, ReactNode } from 'react'
import { useI18n } from '../../app/i18n'

type WorkbenchAccentTone = 'copper' | 'steel'
type WorkbenchBadgeVariant = 'chrome' | 'filter'
type WorkbenchBadgeTone = 'default' | 'muted'
type WorkbenchShareState = 'idle' | 'success' | 'error'

interface WorkbenchToolbarMarkProps {
  label: string
  accentTone?: WorkbenchAccentTone
  className?: string
}

interface WorkbenchToolbarCopyProps {
  kicker: ReactNode
  title: ReactNode
  detail?: ReactNode
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
  summaryBadge?: ReactNode
  actions?: ReactNode
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
          ? 'action-button action-button--ghost action-button--compact action-button--toggled'
          : 'action-button action-button--ghost action-button--compact',
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
  summaryBadge,
  actions,
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

        {filterSummary != null ? (
          <p className="results-panel__filter-summary workbench-filter-header__filter-summary">
            {filterSummary}
          </p>
        ) : null}
      </div>

      {summaryBadge != null || actions != null ? (
        <div className="workbench-filter-header__actions">
          {summaryBadge}
          {actions != null ? (
            <div className="workbench-filter-header__action-row">{actions}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
