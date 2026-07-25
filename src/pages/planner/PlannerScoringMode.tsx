import { useI18n } from '../../app/i18n'
import type { ScoringMode } from '../../domain/planner/steadyStateScoring'

export interface PlannerScoringModeProps {
  value: ScoringMode
  onChange: (mode: ScoringMode) => void
}

const MODES = [
  { id: 'carry-dps' as const, zh: '输出（carryDps）', en: 'Damage (carryDps)' },
  { id: 'team-gold' as const, zh: '金币（team_gold_find）', en: 'Gold (team_gold_find)' },
]

/** 推荐模式选择器：carry-dps 最大化单英雄输出；team-gold 最大化全队金币收益。 */
export function PlannerScoringMode({ value, onChange }: PlannerScoringModeProps) {
  const { t } = useI18n()

  return (
    <fieldset className="planner-scoring-mode" role="radiogroup">
      <legend className="planner-scoring-mode__legend">
        {t({ zh: '推荐模式', en: 'Recommendation mode' })}
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
              {t({ zh: mode.zh, en: mode.en })}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
