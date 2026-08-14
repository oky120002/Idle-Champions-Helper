import { useI18n } from '../../app/i18n'
import type { ScoringMode } from '../../domain/planner/steadyStateScoring'

export interface PlannerScoringModeProps {
  readonly value: ScoringMode
  readonly onChange: (mode: ScoringMode) => void
}

const MODES = [
  { id: 'carry-dps' as const, label: { key: '输出（DPS）' } },
  { id: 'team-gold' as const, label: { key: '金币收益' } },
  { id: 'team-speed' as const, label: { key: '速度推层' } },
]

/** 推荐模式选择器：carry-dps 最大化单英雄输出；team-gold 最大化全队金币收益；team-speed 最大化区域推进效率。 */
export function PlannerScoringMode({ value, onChange }: PlannerScoringModeProps) {
  const { t } = useI18n()

  return (
    <fieldset className="planner-scoring-mode" role="radiogroup">
      <legend className="planner-scoring-mode__legend">
        {t("推荐模式")}
      </legend>
      <div className="planner-scoring-mode__options">
        {MODES.map((mode) => {
          const selected = mode.id === value
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-scoring-mode={mode.id}
              data-selected={selected}
              className="planner-scoring-mode__option"
              onClick={() => {
                if (!selected) {
                  onChange(mode.id)
                }
              }}
            >
              {t(mode.label)}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
