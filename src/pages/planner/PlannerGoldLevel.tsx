import { useState } from 'react'

import { useI18n } from '../../app/i18n'
import type { GoldLevelConversion } from '../../domain/planner/compute/plannerCompute'

export interface PlannerGoldLevelProps {
  readonly mode: 'none' | 'gold' | 'level'
  readonly goldBudget: string
  readonly globalLevel: number
  readonly conversion: GoldLevelConversion | null
  readonly onModeChange: (mode: 'none' | 'gold' | 'level') => void
  readonly onGoldBudgetChange: (value: string) => void
  readonly onGlobalLevelChange: (value: number) => void
}

/**
 * 金币/等级互斥控件（金币预算 → per-hero 等级换算，或全局统一等级）。
 * 不启用时用存档等级（默认）；金币模式输入预算后 worker 异步换算每个英雄可达等级；
 * 等级模式输入统一等级后反算金币。换算结果驱动 heroLevelOverride + goldBudget 传入评估链路。
 */
export function PlannerGoldLevel({ mode, goldBudget, globalLevel, conversion, onModeChange, onGoldBudgetChange, onGlobalLevelChange }: PlannerGoldLevelProps) {
  const { t } = useI18n()
  // level input 本地草稿（允许中途输入不立即回弹，与 PlannerStackCount 同模式）
  const [levelDraft, setLevelDraft] = useState(String(globalLevel))
  const [lastLevel, setLastLevel] = useState(globalLevel)
  if (lastLevel !== globalLevel) {
    setLastLevel(globalLevel)
    setLevelDraft(String(globalLevel))
  }

  const maxLevel = conversion && conversion.heroes.length > 0
    ? Math.max(...conversion.heroes.map(h => h.level))
    : null

  return (
    <fieldset className="planner-scoring-mode" data-testid="planner-gold-level">
      <legend className="planner-scoring-mode__legend">
        {t("金币 / 等级")}
      </legend>
      <label className="planner-gold-level__option">
        <input type="radio" name="gold-level-mode" checked={mode === 'none'} onChange={() => onModeChange('none')} />
        {t("存档等级")}
      </label>
      <label className="planner-gold-level__option">
        <input type="radio" name="gold-level-mode" checked={mode === 'gold'} onChange={() => onModeChange('gold')} />
        {t("金币预算")}
      </label>
      {mode === 'gold' && (
        <input
          type="text"
          value={goldBudget}
          placeholder="1.5e92"
          className="planner-gold-level__input"
          aria-label={t("金币预算")}
          data-testid="planner-gold-budget-input"
          onChange={(e) => onGoldBudgetChange(e.target.value)}
        />
      )}
      <label className="planner-gold-level__option">
        <input type="radio" name="gold-level-mode" checked={mode === 'level'} onChange={() => onModeChange('level')} />
        {t("全局等级")}
      </label>
      {mode === 'level' && (
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={levelDraft}
          className="planner-gold-level__input"
          aria-label={t("全局等级")}
          data-testid="planner-global-level-input"
          onChange={(e) => {
            setLevelDraft(e.target.value)
            const parsed = Number.parseInt(e.target.value, 10)
            if (Number.isFinite(parsed) && parsed >= 1) onGlobalLevelChange(parsed)
          }}
        />
      )}
      {conversion && mode !== 'none' && (
        <span className="planner-gold-level__summary" data-testid="planner-gold-level-summary">
          {mode === 'gold' && maxLevel !== null
            ? t("最高可达 {p0} 级", { p0: String(maxLevel) })
            : t("最高费用 {p0}", { p0: conversion.maxGold })}
        </span>
      )}
    </fieldset>
  )
}
