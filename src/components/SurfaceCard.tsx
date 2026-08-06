import type { ReactNode } from 'react'

interface SurfaceCardProps {
  readonly eyebrow?: string
  readonly title?: string
  readonly description?: string
  readonly headerAside?: ReactNode
  readonly headerContent?: ReactNode
  readonly footer?: ReactNode
  readonly className?: string
  readonly children?: ReactNode
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
  const hasEyebrow = eyebrow != null && eyebrow !== ''
  const hasTitle = title != null && title !== ''
  const hasDescription = description != null && description !== ''
  const hasHeaderAside = Boolean(headerAside)
  const hasHeaderParts = hasEyebrow || hasTitle || hasDescription || hasHeaderAside

  const fallbackHeader = hasHeaderParts ? (
    <>
      <div className="surface-card__header-copy">
        {hasEyebrow ? <p className="surface-card__eyebrow">{eyebrow}</p> : null}
        {hasTitle ? <h2 className="surface-card__title">{title}</h2> : null}
        {hasDescription ? <p className="surface-card__description">{description}</p> : null}
      </div>
      {hasHeaderAside ? <div className="surface-card__header-aside">{headerAside}</div> : null}
    </>
  ) : null

  const resolvedHeader = headerContent ?? fallbackHeader
  const hasHeader = resolvedHeader != null
  const hasFooter = footer != null

  const surfaceCardClassName = ['surface-card', hasHeader ? '' : 'surface-card--headerless', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={surfaceCardClassName}>
      {hasHeader ? <div className="surface-card__header">{resolvedHeader}</div> : null}
      <div className="surface-card__body">{children}</div>
      {hasFooter ? <div className="surface-card__footer">{footer}</div> : null}
    </section>
  )
}
