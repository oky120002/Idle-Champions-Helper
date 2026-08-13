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
        {t("生存阈值（层）")}
      </legend>
      <input
        type="number"
        min={1}
        inputMode="numeric"
        placeholder={t("不设")}
        value={draft}
        className="planner-stack-count__input"
        aria-label={t("生存阈值")}
        data-testid="planner-survivable-area-input"
        onChange={(event) => {
          const raw = event.target.value
          setDraft(raw)
          if (raw === '') {
            onChange(null)
            return
          }
          // Number（非 parseInt）避免 "1.5"→1 / "1e5"→1 的静默截断。
          const parsed = Number(raw)
          if (!Number.isFinite(parsed)) {
            return
          }
          if (parsed < 1) {
            // 0 或负数 = 关闭过滤（与清空一致），而非静默丢弃。
            onChange(null)
            return
          }
          onChange(Math.floor(parsed))
        }}
      />
    </fieldset>
  )
}
