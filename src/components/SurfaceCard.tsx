import type { PropsWithChildren, ReactNode } from 'react'

interface SurfaceCardProps extends PropsWithChildren {
  eyebrow?: string
  title: string
  description?: string
  footer?: ReactNode
  className?: string
}

export function SurfaceCard({
  eyebrow,
  title,
  description,
  footer,
  className,
  children,
}: SurfaceCardProps) {
  return (
    <section className={className ? `surface-card ${className}` : 'surface-card'}>
      {eyebrow ? <p className="surface-card__eyebrow">{eyebrow}</p> : null}
      <h2 className="surface-card__title">{title}</h2>
      {description ? <p className="surface-card__description">{description}</p> : null}
      <div className="surface-card__body">{children}</div>
      {footer ? <div className="surface-card__footer">{footer}</div> : null}
    </section>
  )
}
