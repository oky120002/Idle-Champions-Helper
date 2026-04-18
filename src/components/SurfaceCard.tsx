import type { PropsWithChildren, ReactNode } from 'react'

interface SurfaceCardProps extends PropsWithChildren {
  eyebrow?: string
  title?: string
  description?: string
  headerAside?: ReactNode
  headerContent?: ReactNode
  footer?: ReactNode
  className?: string
}

export function SurfaceCard({
  eyebrow,
  title,
  description,
  headerAside,
  headerContent,
  footer,
  className,
  children,
}: SurfaceCardProps) {
  const resolvedHeader =
    headerContent ??
    (eyebrow || title || description || headerAside ? (
      <>
        <div className="surface-card__header-copy">
          {eyebrow ? <p className="surface-card__eyebrow">{eyebrow}</p> : null}
          {title ? <h2 className="surface-card__title">{title}</h2> : null}
          {description ? <p className="surface-card__description">{description}</p> : null}
        </div>
        {headerAside ? <div className="surface-card__header-aside">{headerAside}</div> : null}
      </>
    ) : null)

  return (
    <section className={className ? `surface-card ${className}` : 'surface-card'}>
      {resolvedHeader ? <div className="surface-card__header">{resolvedHeader}</div> : null}
      <div className="surface-card__body">{children}</div>
      {footer ? <div className="surface-card__footer">{footer}</div> : null}
    </section>
  )
}
