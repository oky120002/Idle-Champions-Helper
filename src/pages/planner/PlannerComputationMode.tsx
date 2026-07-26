import { useI18n } from '../../app/i18n'
import type { ComputationMode } from '../../domain/planner/computationMode'

export interface PlannerComputationModeProps {
  value: ComputationMode
  onChange: (mode: ComputationMode) => void
}

const MODES: Array<{ id: ComputationMode; zh: string; en: string }> = [
  { id: 'full', zh: '全量', en: 'Full' },
  { id: 'p90', zh: 'P90', en: 'P90' },
  { id: 'p80', zh: 'P80', en: 'P80' },
  { id: 'p70', zh: 'P70', en: 'P70' },
  { id: 'p60', zh: 'P60', en: 'P60' },
  { id: 'p50', zh: 'P50', en: 'P50' },
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
        {t({ zh: '计算模式', en: 'Computation' })}
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
              {t({ zh: mode.zh, en: mode.en })}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
