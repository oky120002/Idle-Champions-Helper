import type { LocalizedText } from '../../domain/types'
import type {
  DetailFieldProps,
  DetailSectionHeaderProps,
  SummaryTagGroupProps,
  UpgradeSpecializationArtProps,
} from './types'

export function LocalizedTextStack({ value }: { value: LocalizedText }) {
  const hasSecondary = value.display.trim() !== value.original.trim()

  return (
    <span className="localized-text-stack">
      <span className="localized-text-stack__primary">{value.display}</span>
      {hasSecondary ? <span className="localized-text-stack__secondary">{value.original}</span> : null}
    </span>
  )
}

export function DetailSectionHeader({ eyebrow, description, title, badges }: DetailSectionHeaderProps) {
  return (
    <header className="detail-section-header">
      <div className="detail-section-header__copy">
        {eyebrow ? <p className="detail-section-header__eyebrow">{eyebrow}</p> : null}
        <h2 className="detail-section-header__title">{title}</h2>
        {description ? <p className="detail-section-header__description">{description}</p> : null}
      </div>
      {badges.length > 0 ? (
        <div className="detail-section-header__badge-row">
          {badges.map((badge) => (
            <span key={`${badge.label}-${badge.value}`} className="detail-section-header__badge">
              <span className="detail-section-header__badge-label">{badge.label}</span>
              <strong className="detail-section-header__badge-value">{badge.value}</strong>
            </span>
          ))}
        </div>
      ) : null}
    </header>
  )
}

export function SummaryTagGroup({ label, items }: SummaryTagGroupProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="summary-tag-group">
      <p className="summary-tag-group__label">{label}</p>
      <div className="summary-tag-group__items">
        {items.map((item) => (
          <span key={item} className="summary-tag-group__chip">
            {item}
          </span>
        ))}
      </div>
    </section>
  )
}

export function UpgradeSpecializationArt({ src, alt }: UpgradeSpecializationArtProps) {
  return (
    <div className="upgrade-card__spec-art" aria-hidden="true">
      <img src={src} alt={alt} loading="lazy" />
    </div>
  )
}

export function DetailField({ label, value, hint, variant = 'default' }: DetailFieldProps) {
  return (
    <article className={variant === 'compact' ? 'detail-field detail-field--compact' : 'detail-field'}>
      <span className="detail-field__label">{label}</span>
      <div className="detail-field__value">{value}</div>
      {hint ? <span className="detail-field__hint">{hint}</span> : null}
    </article>
  )
}
