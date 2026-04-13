import type { ReactNode } from 'react'

export type StatusTone = 'info' | 'success' | 'error'

interface StatusBannerProps {
  tone: StatusTone
  title?: ReactNode
  detail?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  children?: ReactNode
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

export function StatusBanner({ tone, title, detail, meta, actions, children }: StatusBannerProps) {
  const hasContent = title !== undefined || detail !== undefined || meta !== undefined || children !== undefined

  return (
    <div className={getStatusBannerClassName(tone)}>
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
