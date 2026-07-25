import { useI18n } from '../../app/i18n'
import type { CandidateMode } from '../../domain/planner/candidatePool'

export interface PlannerCandidateModeProps {
  value: CandidateMode
  onChange: (mode: CandidateMode) => void
}

const MODES: Array<{ id: CandidateMode; zh: string; en: string }> = [
  { id: 'owned-only', zh: '仅已拥有', en: 'Owned only' },
  { id: 'all-hypothetical', zh: '全部英雄（假设基线）', en: 'All hypothetical' },
]

/**
 * 候选范围选择器（阶段 15.3）。
 * owned-only = 仅本地已拥有；all-hypothetical = 所有英雄（未拥有走 hypotheticalBaseline 假设）。
 * 复用 planner-scoring-mode 样式保持视觉一致。
 */
export function PlannerCandidateMode({ value, onChange }: PlannerCandidateModeProps) {
  const { t } = useI18n()

  return (
    <fieldset className="planner-scoring-mode" role="radiogroup" data-testid="planner-candidate-mode">
      <legend className="planner-scoring-mode__legend">
        {t({ zh: '候选范围', en: 'Candidate pool' })}
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
              data-candidate-mode={mode.id}
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
