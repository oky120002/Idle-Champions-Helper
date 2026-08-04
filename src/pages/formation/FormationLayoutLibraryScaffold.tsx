import type { ReactNode } from 'react'
import { FormFieldSchemaRenderer, type FormFieldSchema } from '../../components/FormFieldSchemaRenderer'

interface FormationLayoutLibraryStatItem {
  id: string
  label: ReactNode
  value: ReactNode
  compact?: boolean
}

interface FormationLayoutLibrarySelectionPill {
  id: string
  label: ReactNode
  tone?: 'default' | 'muted'
}

interface FormationLayoutLibraryCardItem {
  id: string
  ariaLabel: string
  title: ReactNode
  countLabel: ReactNode
  sourceLabel: ReactNode
  metaPills: Array<{ id: string; label: ReactNode }>
  isActive: boolean
  onSelect: () => void
}

interface FormationLayoutLibraryScaffoldProps {
  ariaLabel: string
  eyebrow: ReactNode
  title: ReactNode
  description: ReactNode
  statsLabel: string
  stats: FormationLayoutLibraryStatItem[]
  fields: FormFieldSchema[]
  selection: {
    kicker: ReactNode
    title: ReactNode
    description: ReactNode
    pills: FormationLayoutLibrarySelectionPill[]
  }
  resultsLabel: ReactNode
  resultsDescription: ReactNode
  cardsAriaLabel: string
  cards: FormationLayoutLibraryCardItem[]
}

export function FormationLayoutLibraryScaffold({
  ariaLabel,
  eyebrow,
  title,
  description,
  statsLabel,
  stats,
  fields,
  selection,
  resultsLabel,
  resultsDescription,
  cardsAriaLabel,
  cards,
}: FormationLayoutLibraryScaffoldProps) {
  return (
    <section className="formation-layout-library" aria-label={ariaLabel}>
      <div className="formation-layout-library__hero">
        <div className="formation-layout-library__copy">
          <span className="formation-layout-library__eyebrow">{eyebrow}</span>
          <h3 className="formation-layout-library__title">{title}</h3>
          <p className="formation-layout-library__description">{description}</p>
        </div>

        <div className="formation-layout-library__stats" aria-label={statsLabel}>
          {stats.map((item) => (
            <article key={item.id} className="formation-layout-library__stat-card">
              <span className="formation-layout-library__stat-label">{item.label}</span>
              <strong
                className={
                  item.compact
                    ? 'formation-layout-library__stat-value formation-layout-library__stat-value--compact'
                    : 'formation-layout-library__stat-value'
                }
              >
                {item.value}
              </strong>
            </article>
          ))}
        </div>
      </div>

      <div className="formation-layout-library__workspace">
        <FormFieldSchemaRenderer fields={fields} className="formation-layout-library__filters" />

        <article className="formation-layout-library__selected-card">
          <span className="formation-layout-library__selected-kicker">{selection.kicker}</span>
          <strong className="formation-layout-library__selected-title">{selection.title}</strong>
          <p className="formation-layout-library__selected-description">{selection.description}</p>

          {selection.pills.length > 0 ? (
            <div className="formation-layout-library__selected-meta">
              {selection.pills.map((pill) => (
                <span
                  key={pill.id}
                  className={
                    pill.tone === 'muted'
                      ? 'formation-layout-library__selected-pill formation-layout-library__selected-pill--muted'
                      : 'formation-layout-library__selected-pill'
                  }
                >
                  {pill.label}
                </span>
              ))}
            </div>
          ) : null}
        </article>
      </div>

      <div className="formation-layout-library__results-head">
        <div className="formation-layout-library__results-copy">
          <strong>{resultsLabel}</strong>
          <span>{resultsDescription}</span>
        </div>
      </div>

      {cards.length > 0 ? (
        <div className="formation-layout-library__list" role="list" aria-label={cardsAriaLabel}>
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              aria-label={card.ariaLabel}
              className={card.isActive ? 'formation-layout-card formation-layout-card--active' : 'formation-layout-card'}
              onClick={card.onSelect}
            >
              <div className="formation-layout-card__topline">
                <strong className="formation-layout-card__title">{card.title}</strong>
                <span className="formation-layout-card__count">{card.countLabel}</span>
              </div>

              <div className="formation-layout-card__meta-row">
                {card.metaPills.map((pill) => (
                  <span key={pill.id} className="formation-layout-card__meta-pill">
                    {pill.label}
                  </span>
                ))}
              </div>

              <span className="formation-layout-card__source">{card.sourceLabel}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
