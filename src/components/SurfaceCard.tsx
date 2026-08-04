import type { ReactNode } from 'react'

interface SurfaceCardProps {
  readonly children?: ReactNode
  readonly eyebrow?: string
  readonly title?: string
  readonly description?: string
  readonly headerAside?: ReactNode
  readonly headerContent?: ReactNode
  readonly footer?: ReactNode
  readonly className?: string
}

function isNonEmptyString(value: string | undefined): boolean {
  return value !== undefined && value !== ''
}

function buildStandardHeader(
  eyebrow: string | undefined,
  title: string | undefined,
  description: string | undefined,
  headerAside: ReactNode | undefined,
): ReactNode | null {
  const hasHeaderFields =
    isNonEmptyString(eyebrow) ||
    isNonEmptyString(title) ||
    isNonEmptyString(description) ||
    headerAside !== undefined

  if (!hasHeaderFields) {
    return null
  }

  return (
    <>
      <div className="surface-card__header-copy">
        {isNonEmptyString(eyebrow) ? <p className="surface-card__eyebrow">{eyebrow}</p> : null}
        {isNonEmptyString(title) ? <h2 className="surface-card__title">{title}</h2> : null}
        {isNonEmptyString(description) ? <p className="surface-card__description">{description}</p> : null}
      </div>
      {headerAside !== undefined ? <div className="surface-card__header-aside">{headerAside}</div> : null}
    </>
  )
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
  const standardHeader = buildStandardHeader(eyebrow, title, description, headerAside)
  const resolvedHeader = headerContent ?? standardHeader
  const hasHeader = resolvedHeader !== null && resolvedHeader !== undefined

  const surfaceCardClassName = ['surface-card', hasHeader ? '' : 'surface-card--headerless', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={surfaceCardClassName}>
      {hasHeader ? <div className="surface-card__header">{resolvedHeader}</div> : null}
      <div className="surface-card__body">{children}</div>
      {footer !== undefined ? <div className="surface-card__footer">{footer}</div> : null}
    </section>
  )
}
