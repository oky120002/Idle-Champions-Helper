import { useI18n, type MessageRef } from '../../app/i18n'
import type { CandidateMode } from '../../domain/planner/candidatePool'

export interface PlannerCandidateModeProps {
  readonly value: CandidateMode
  readonly onChange: (mode: CandidateMode) => void
}

const MODES: Array<{ id: CandidateMode; label: MessageRef }> = [
  { id: 'owned-only', label: { key: '仅已拥有' } },
  { id: 'all-hypothetical', label: { key: '全部英雄（假设基线）' } },
]

/**
 * 候选范围选择器。
 * owned-only = 仅本地已拥有；all-hypothetical = 所有英雄（未拥有走 hypotheticalBaseline 假设）。
 * 复用 planner-scoring-mode 样式保持视觉一致。
 */
export function PlannerCandidateMode({ value, onChange }: PlannerCandidateModeProps) {
  const { t } = useI18n()

  return (
    <fieldset className="planner-scoring-mode" role="radiogroup" data-testid="planner-candidate-mode">
      <legend className="planner-scoring-mode__legend">
        {t("候选范围")}
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
              {t(mode.label)}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
