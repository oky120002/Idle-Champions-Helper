import type { PlannerResult } from '../../domain/planner/recommendationTypes'
import { useI18n } from '../../app/i18n'

export type PlannerResultCardProps = PlannerResult

export function PlannerResultCard({
  score,
  placements,
  placementEntries,
  explanations,
  warnings,
}: PlannerResultCardProps) {
  const { t } = useI18n()
  const fallbackPlacementEntries = Object.entries(placements).map(([slotId, heroId]) => ({
    slotId,
    slotLabel: slotId,
    heroId,
    heroName: heroId,
    seat: null,
  }))
  const displayPlacementEntries = placementEntries && placementEntries.length > 0
    ? placementEntries
    : fallbackPlacementEntries

  return (
    <article
      className="surface-card planner-result-card"
      aria-label={t({ zh: '推荐结果', en: 'Recommended result' })}
    >
      <div className="surface-card__header">
        <div className="surface-card__header-copy">
          <p className="surface-card__eyebrow">
            {t({ zh: '推荐结果', en: 'Recommended result' })}
          </p>
          <h3 className="surface-card__title">
            {t({ zh: '当前推荐阵型', en: 'Current recommended formation' })}
          </h3>
          <div className="planner-result-card__header-meta">
            <p className="planner-result-card__score">
              <span>{t({ zh: '评分', en: 'Score' })}</span>
              <strong>{score}</strong>
            </p>
            <p className="planner-result-card__slot-count">
              {t({
                zh: `已填充 ${displayPlacementEntries.length} 个槽位`,
                en: `${displayPlacementEntries.length} slots filled`,
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card__body">
        <div className="planner-result-card__body-grid">
          <section className="planner-result-card__placements-panel">
            <h4 className="planner-result-card__section-title">
              {t({ zh: '阵位分配', en: 'Slot assignments' })}
            </h4>
            <ol className="planner-result-card__placements">
              {displayPlacementEntries.map((entry) => (
                <li
                  key={entry.slotId}
                  data-slot-id={entry.slotId}
                  data-hero-id={entry.heroId}
                  className="planner-result-card__placement"
                >
                  <span className="planner-result-card__placement-slot">
                    {t({ zh: `槽位 ${entry.slotLabel}`, en: `Slot ${entry.slotLabel}` })}
                  </span>
                  <span className="planner-result-card__placement-copy">
                    <strong>{entry.heroName}</strong>
                    <span>
                      {entry.seat !== null
                        ? t({ zh: `Seat ${entry.seat} · ${entry.heroId}`, en: `Seat ${entry.seat} · ${entry.heroId}` })
                        : entry.heroId}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <div className="planner-result-card__notes">
            {explanations.length > 0 && (
              <section data-section="explanations" className="planner-result-card__explanations">
                <h4 className="planner-result-card__section-title">
                  {t({ zh: '评分依据', en: 'Why this result' })}
                </h4>
                <ul>
                  {explanations.map((line, index) => (
                    <li key={index}>{t(line)}</li>
                  ))}
                </ul>
              </section>
            )}

            {warnings.length > 0 && (
              <section data-section="warnings" className="planner-result-card__warnings">
                <h4 className="planner-result-card__section-title">
                  {t({ zh: '当前警告', en: 'Warnings' })}
                </h4>
                <ul>
                  {warnings.map((text, index) => (
                    <li key={index}>{text}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
