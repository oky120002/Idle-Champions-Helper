import { useState } from 'react'

import { useI18n } from '../../app/i18n'

export interface PlannerSurvivableAreaProps {
  readonly value: number | null
  readonly onChange: (area: number | null) => void
}

/**
 * 生存阈值：低于此层数的阵型被淘汰。
 * null = 不设阈值（仅报告不过滤）；用户输入数字后启用过滤。
 * 护甲变体同时检查击杀侧（killableArea），与生存过滤同构。
 */
export function PlannerSurvivableArea({ value, onChange }: PlannerSurvivableAreaProps) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(value != null ? String(value) : '')
  const [lastValue, setLastValue] = useState(value)
  if (lastValue !== value) {
    setLastValue(value)
    setDraft(value != null ? String(value) : '')
  }

  return (
    <fieldset className="planner-scoring-mode" data-testid="planner-survivable-area">
      <legend className="planner-scoring-mode__legend">
        {t({ zh: '生存阈值（层）', en: 'Survival threshold (area)' })}
      </legend>
      <input
        type="number"
        min={1}
        inputMode="numeric"
        placeholder={t({ zh: '不设', en: 'off' })}
        value={draft}
        className="planner-stack-count__input"
        aria-label={t({ zh: '生存阈值', en: 'Survival threshold' })}
        data-testid="planner-survivable-area-input"
        onChange={(event) => {
          const raw = event.target.value
          setDraft(raw)
          if (raw === '') {
            onChange(null)
            return
          }
          const parsed = Number.parseInt(raw, 10)
          if (Number.isFinite(parsed) && parsed >= 1) {
            onChange(parsed)
          }
        }}
      />
    </fieldset>
  )
}
