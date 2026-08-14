import type { Champion, FormationSlot } from '../../domain/types'
import type { PlannerResult } from '../../domain/planner/recommendationTypes'
import type { ScoringMode } from '../../domain/planner/steadyStateScoring'
import { useI18n, type MessageRef } from '../../app/i18n'
import { FormationBoardCanvas } from '../formation/FormationBoardCanvas'
import { PlannerAreaEstimate } from './PlannerAreaEstimate'
import { PlannerBreakdown } from './PlannerBreakdown'
import { PlannerSpeedBreakdown } from './PlannerSpeedBreakdown'

export type PlannerResultCardProps = PlannerResult & {
  scoringMode?: ScoringMode
  slots: FormationSlot[]
  championById: Map<string, Champion>
}

export function PlannerResultCard({
  objectiveValue,
  carryHeroId,
  placements,
  placementEntries,
  explanations,
  warnings,
  areaEstimate,
  viability,
  breakdown,
  speedBreakdown,
  scoringMode = 'carry-dps',
  slots,
  championById,
}: PlannerResultCardProps) {
  const { t } = useI18n()
  const SCORE_LABELS: Record<ScoringMode, MessageRef> = {
    'carry-dps': { key: '核心英雄 DPS' },
    'team-gold': { key: '金币收益' },
    'team-speed': { key: '速度因子' },
  }
  const scoreLabel = t(SCORE_LABELS[scoringMode])
  const fallbackPlacementEntries = Object.entries(placements).map(([slotId, heroId]) => ({
    slotId,
    heroId,
    slotLabel: slotId,
    heroName: heroId,
    seat: null,
  }))
  const displayPlacementEntries = placementEntries && placementEntries.length > 0
    ? placementEntries
    : fallbackPlacementEntries
  const heroNameById = new Map<string, string>(
    displayPlacementEntries.map((entry) => [entry.heroId, entry.heroName]),
  )
  const carrySlotId = carryHeroId != null && carryHeroId !== ''
    ? Object.entries(placements).find(([, heroId]) => heroId === carryHeroId)?.[0] ?? null
    : null

  return (
    <article
      className="surface-card planner-result-card"
      aria-label={t("推荐结果")}
    >
      <div className="surface-card__header">
        <div className="surface-card__header-copy">
          <p className="surface-card__eyebrow">
            {t("推荐结果")}
          </p>
          <h3 className="surface-card__title">
            {t("当前推荐阵型")}
          </h3>
          <div className="planner-result-card__header-meta">
            <p className="planner-result-card__score">
              <span>{scoreLabel}</span>
              <strong>{objectiveValue}</strong>
            </p>
            <p className="planner-result-card__slot-count">
              {t("已填充 {p0} 个槽位", { p0: String(displayPlacementEntries.length) })}
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card__body">
        {slots.length > 0 ? (
          <section className="planner-result-card__board-panel" data-section="board">
            <h4 className="planner-result-card__section-title">
              {t("阵型棋盘")}
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
              {t("阵位分配")}
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
                    {t("槽位 {p0}", { p0: entry.slotLabel })}
                  </span>
                  <span className="planner-result-card__placement-copy">
                    <strong>{entry.heroName}</strong>
                    <span>
                      {entry.seat !== null
                        ? t("Seat {p0} · {p1}", { p0: String(entry.seat), p1: entry.heroId })
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
                  {t("推荐依据")}
                </h4>
                <ul>
                  {explanations.map((line, index) => (
                    <li key={index}>{t(line)}</li>
                  ))}
                </ul>
              </section>
            )}

            <PlannerBreakdown breakdown={breakdown} heroNameById={heroNameById} />

            <PlannerSpeedBreakdown breakdown={speedBreakdown} heroNameById={heroNameById} />

            {areaEstimate ? (
              <PlannerAreaEstimate
                areaEstimate={areaEstimate}
                activeConstraints={viability?.activeConstraints}
              />
            ) : null}

            {warnings.length > 0 && (
              <section data-section="warnings" className="planner-result-card__warnings">
                <h4 className="planner-result-card__section-title">
                  {t("当前警告")}
                </h4>
                <ul>
                  {warnings.map((text, index) => (
                    <li key={index}>{t(text)}</li>
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
