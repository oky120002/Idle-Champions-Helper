import type { Champion, FormationSlot } from '../../domain/types'
import type { ConstraintKind, PlannerResult } from '../../domain/planner/recommendationTypes'
import type { ScoringMode } from '../../domain/planner/steadyStateScoring'
import type { AreaBound } from '../../domain/simulator/areaEstimation'
import { useI18n, type LocaleText } from '../../app/i18n'
import { FormationBoardCanvas } from '../formation/FormationBoardCanvas'
import { PlannerBreakdown } from './PlannerBreakdown'

const CONSTRAINT_LABELS: Record<ConstraintKind, LocaleText> = {
  armor: { zh: '护甲', en: 'Armor' },
  'hits-based': { zh: '命中型', en: 'Hits-based' },
  'damage-reduction': { zh: '伤害削减', en: 'Dmg reduction' },
  'enemy-buff': { zh: '敌人强化', en: 'Enemy buff' },
  'health-drain': { zh: '持续掉血', en: 'Health drain' },
}

const BOUND_LABELS: Record<AreaBound, LocaleText> = {
  survival: { zh: '存活受限', en: 'survival-bound' },
  armor: { zh: '护甲受限', en: 'armor-bound' },
  'hits-based': { zh: '命中型受限', en: 'hits-bound' },
  bud: { zh: '伤害受限', en: 'BUD-bound' },
  'max-area': { zh: '已达上限', en: 'max-area' },
}

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
  scoringMode = 'carry-dps',
  slots,
  championById,
}: PlannerResultCardProps) {
  const { t } = useI18n()
  const scoreLabel = scoringMode === 'team-gold'
    ? t({ zh: '金币收益', en: 'Team gold find' })
    : scoringMode === 'team-speed'
      ? t({ zh: '速度因子', en: 'Speed factor' })
      : t({ zh: '核心英雄 DPS', en: 'Carry DPS' })
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
  const boundLabel = t(BOUND_LABELS[areaEstimate?.boundBy ?? 'max-area'])

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
              <strong>{objectiveValue}</strong>
            </p>
            <p className="planner-result-card__slot-count">
              {t({
                zh: `已填充 ${String(displayPlacementEntries.length)} 个槽位`,
                en: `${String(displayPlacementEntries.length)} slots filled`,
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
                        ? t({ zh: `Seat ${String(entry.seat)} · ${entry.heroId}`, en: `Seat ${String(entry.seat)} · ${entry.heroId}` })
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
                  {t({ zh: '推荐依据', en: 'Why this result' })}
                </h4>
                <ul>
                  {explanations.map((line, index) => (
                    <li key={index}>{t(line)}</li>
                  ))}
                </ul>
              </section>
            )}

            <PlannerBreakdown breakdown={breakdown} heroNameById={heroNameById} />

            {areaEstimate ? (
              <section data-section="area-estimate" className="planner-result-card__area-estimate">
                <h4 className="planner-result-card__section-title">
                  {t({ zh: '推图预估', en: 'Area estimate' })}
                </h4>
                <p data-testid="planner-area-estimate">
                  {t({ zh: `约可推进到第 ${String(areaEstimate.area)} 层`, en: `~ area ${String(areaEstimate.area)}` })}
                </p>
                <p className="planner-result-card__area-estimate-note">
                  {t({
                    zh: `约束：${boundLabel}（击杀上限 ${String(areaEstimate.killableArea)} / 存活上限 ${String(areaEstimate.survivableArea)}，绝对值未校准）`,
                    en: `bound: ${boundLabel} (killable ${String(areaEstimate.killableArea)} / survivable ${String(areaEstimate.survivableArea)}, uncalibrated)`,
                  })}
                </p>
                {viability != null && viability.activeConstraints.length > 0 ? (
                  <p className="planner-result-card__viability-constraints" data-testid="planner-viability-constraints">
                    {t({ zh: '活跃约束：', en: 'Active constraints: ' })}
                    {viability.activeConstraints.map((key) => t(CONSTRAINT_LABELS[key])).join(t({ zh: '、', en: ', ' }))}
                  </p>
                ) : null}
              </section>
            ) : null}

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
