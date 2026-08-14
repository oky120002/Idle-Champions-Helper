import { useI18n, type MessageRef } from '../../app/i18n'
import type { ComputationMode } from '../../domain/planner/computationMode'

export interface PlannerComputationModeProps {
  readonly value: ComputationMode
  readonly onChange: (mode: ComputationMode) => void
}

const MODES: Array<{ id: ComputationMode; label: MessageRef }> = [
  { id: 'full', label: { key: '全量' } },
  { id: 'p90', label: { key: 'P90' } },
  { id: 'p80', label: { key: 'P80' } },
  { id: 'p70', label: { key: 'P70' } },
  { id: 'p60', label: { key: 'P60' } },
  { id: 'p50', label: { key: 'P50' } },
]

/**
 * 计算模式选择器（性能 vs 精度）。
 * full = 全量候选，最准最慢；p90/p80/p70/p60/p50 = 每席位按复合收益取前对应比例，越靠后越快。
 * 收益由 build 期预算进 hero-abilities.json 的 gainProfile；默认 p50（见 usePlannerPageModel）。
 * 复用 planner-scoring-mode 样式保持视觉一致。
 */
export function PlannerComputationMode({ value, onChange }: PlannerComputationModeProps) {
  const { t } = useI18n()

  return (
    <fieldset className="planner-scoring-mode" role="radiogroup" data-testid="planner-computation-mode">
      <legend className="planner-scoring-mode__legend">
        {t("计算模式")}
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
              data-computation-mode={mode.id}
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
