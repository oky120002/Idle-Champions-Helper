import type { ReactNode } from 'react'
import { CheckCircle2, CircleAlert, Info } from 'lucide-react'

export type StatusTone = 'info' | 'success' | 'error'

interface StatusBannerProps {
  readonly tone: StatusTone
  readonly title?: ReactNode
  readonly detail?: ReactNode
  readonly meta?: ReactNode
  readonly actions?: ReactNode
  readonly children?: ReactNode
}

function getStatusBannerClassName(tone: StatusTone): string {
  if (tone === 'success') {
    return 'status-banner status-banner--success'
  }

  if (tone === 'error') {
    return 'status-banner status-banner--error'
  }

  return 'status-banner status-banner--info'
}

const STATUS_BANNER_ICONS: Record<StatusTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: CircleAlert,
  info: Info,
}

export function StatusBanner({ tone, title, detail, meta, actions, children }: StatusBannerProps) {
  const hasContent = title !== undefined || detail !== undefined || meta !== undefined || children !== undefined
  const Icon = STATUS_BANNER_ICONS[tone]

  return (
    <div className={getStatusBannerClassName(tone)}>
      <span className="status-banner__icon" aria-hidden="true">
        <Icon strokeWidth={1.85} />
      </span>
      {hasContent ? (
        <div className="status-banner__content">
          {title !== undefined ? <strong className="status-banner__title">{title}</strong> : null}
          {detail !== undefined ? <p className="status-banner__detail">{detail}</p> : null}
          {children}
          {meta !== undefined ? <div className="status-banner__meta">{meta}</div> : null}
        </div>
      ) : null}
      {actions !== undefined ? <div className="status-banner__actions">{actions}</div> : null}
    </div>
  )
}
