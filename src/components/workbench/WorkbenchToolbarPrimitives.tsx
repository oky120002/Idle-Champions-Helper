import type { CSSProperties, ReactNode } from 'react'
import { useI18n } from '../../app/i18n'
import type { WorkbenchAccentTone, WorkbenchBadgeTone, WorkbenchBadgeVariant } from './WorkbenchScaffold'

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
  const status = activeCount > 0
    ? t({ zh: `${String(activeCount)} 项条件`, en: `${String(activeCount)} active` })
    : t({ zh: '条件待命', en: 'Filters idle' })
  const statusTitle = activeCount > 0
    ? t({ zh: `${String(activeCount)} 项筛选条件已启用`, en: `${String(activeCount)} active filters enabled` })
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
      {kicker !== null && kicker !== undefined ? <span className="workbench-page__toolbar-kicker">{kicker}</span> : null}
      <strong className="workbench-page__toolbar-title">{title}</strong>
      {detail !== null && detail !== undefined ? <span className="workbench-page__toolbar-detail">{detail}</span> : null}
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
