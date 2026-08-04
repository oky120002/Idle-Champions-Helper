import { useState } from 'react'

import { useI18n } from '../../app/i18n'

export interface PlannerStackCountProps {
  readonly value: number
  readonly onChange: (count: number) => void
}

/**
 * 动态层数假设输入（dynamic-stack-multiply 机制，如蔚"出言不逊永不够"）。
 * stacksMultiply=true 的 signal 按此层数乘算（percentToMultiplier(value)^count）；
 * 默认 DEFAULT_MANUAL_STACK_COUNT=1000（见 placementFit）。用户按当前冒险最高区域设定（如 area×10）。
 * 仅影响动态层数类 signal；formation-count 等实时数英雄的机制不受影响。
 * 复用 planner-scoring-mode 容器样式保持视觉一致（与 PlannerComputationMode 同行）。
 */
export function PlannerStackCount({ value, onChange }: PlannerStackCountProps) {
  const { t } = useI18n()
  // 本地草稿：允许清空/中途输入不立即回弹（受控 input 直接绑 value 会在解析失败时把用户输入抹回旧值）。
  // value 外部变更时在渲染期同步草稿（React 官方「从上一次渲染存储信息」模式，避免 setState-in-effect）。
  const [draft, setDraft] = useState(String(value))
  const [lastValue, setLastValue] = useState(value)
  if (lastValue !== value) {
    setLastValue(value)
    setDraft(String(value))
  }

  return (
    <fieldset className="planner-scoring-mode" data-testid="planner-stack-count">
      <legend className="planner-scoring-mode__legend">
        {t({ zh: '动态层数假设', en: 'Stack assumption' })}
      </legend>
      <input
        type="number"
        min={1}
        inputMode="numeric"
        value={draft}
        className="planner-stack-count__input"
        aria-label={t({ zh: '动态层数假设', en: 'Stack assumption' })}
        data-testid="planner-stack-count-input"
        onChange={(event) => {
          const raw = event.target.value
          setDraft(raw)
          const parsed = Number.parseInt(raw, 10)
          if (Number.isFinite(parsed) && parsed >= 1 && parsed !== value) {
            onChange(parsed)
          }
        }}
      />
    </fieldset>
  )
}
