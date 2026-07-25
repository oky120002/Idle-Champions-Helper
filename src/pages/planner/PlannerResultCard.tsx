import type { Champion, FormationSlot } from '../../domain/types'
import type { PlannerResult } from '../../domain/planner/recommendationTypes'
import type { ScoringMode } from '../../domain/planner/steadyStateScoring'
import { useI18n } from '../../app/i18n'
import { FormationBoardCanvas } from '../formation/FormationBoardCanvas'

export type PlannerResultCardProps = PlannerResult & {
  scoringMode?: ScoringMode
  slots: FormationSlot[]
  championById: Map<string, Champion>
}

export function PlannerResultCard({
  score,
  carryHeroId,
  placements,
  placementEntries,
  explanations,
  warnings,
  scoringMode = 'carry-dps',
  slots,
  championById,
}: PlannerResultCardProps) {
  const { t } = useI18n()
  const scoreLabel = scoringMode === 'team-gold'
    ? t({ zh: '金币收益', en: 'Team gold find' })
    : t({ zh: 'carryDps', en: 'carryDps' })
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
  const carrySlotId = carryHeroId
    ? Object.entries(placements).find(([, heroId]) => heroId === carryHeroId)?.[0] ?? null
    : null

  return (
    <article
      className="surface-card planner-result-card"
      aria-label={t({ zh: '推荐结果', en: 'Recommended Result' })}
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
              <span>{scoreLabel}</span>
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
        {slots.length > 0 ? (
          <section className="planner-result-card__board-panel" data-section="board">
            <h4 className="planner-result-card__section-title">
              {t({ zh: '阵型棋盘', en: 'Formation board' })}
            </h4>
            <FormationBoardCanvas
              slots={slots}
              placements={placements}
              championById={championById}
              carrySlotId={carrySlotId}
              testId="planner-result-board"
            />
          </section>
        ) : null}

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
