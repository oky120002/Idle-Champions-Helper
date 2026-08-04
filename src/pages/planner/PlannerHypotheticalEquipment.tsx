import { useState } from 'react'

import { useI18n } from '../../app/i18n'

export interface PlannerHypotheticalEquipmentProps {
  readonly rarity: number
  readonly enchant: number
  readonly onRarityChange: (rarity: number) => void
  readonly onEnchantChange: (enchant: number) => void
}

const RARITY_OPTIONS: ReadonlyArray<{ value: number; zh: string; en: string }> = [
  { value: 1, zh: '普通', en: 'Common' },
  { value: 2, zh: '精良', en: 'Uncommon' },
  { value: 3, zh: '史诗', en: 'Epic' },
  { value: 4, zh: '传说', en: 'Legendary' },
]

/**
 * 假设装备配置（未导入存档时 UI what-if）：统一稀有度 + 附魔等级，套到每个英雄每个槽位。
 * 默认毕业 = 传说(4) + 2000 级，二者可调。仅 profileSnapshot 为空（未导入存档）时影响计算——
 * buildScoringBonusInputs 有存档时按存档 per-slot 实际，忽略此配置；故调用方按「未导入存档」条件渲染。
 * 与 manualStackCount 同性质（标量假设入参），复用 planner-scoring-mode 容器样式。
 */
export function PlannerHypotheticalEquipment({ rarity, enchant, onRarityChange, onEnchantChange }: PlannerHypotheticalEquipmentProps) {
  const { t } = useI18n()
  // enchant input 本地草稿（同 PlannerStackCount：受控 input 解析失败不抹回旧值，外部变更渲染期同步草稿）。
  const [draft, setDraft] = useState(String(enchant))
  const [lastEnchant, setLastEnchant] = useState(enchant)
  if (lastEnchant !== enchant) {
    setLastEnchant(enchant)
    setDraft(String(enchant))
  }

  return (
    <fieldset className="planner-scoring-mode planner-hypothetical-equipment" data-testid="planner-hypothetical-equipment">
      <legend className="planner-scoring-mode__legend">
        {t({ zh: '假设装备（未导入存档）', en: 'Hypothetical gear (no save)' })}
      </legend>
      <label className="planner-hypothetical-equipment__field">
        <span>{t({ zh: '稀有度', en: 'Rarity' })}</span>
        <select
          className="planner-stack-count__input"
          value={rarity}
          data-testid="planner-hypothetical-equipment-rarity"
          aria-label={t({ zh: '假设装备稀有度', en: 'Hypothetical gear rarity' })}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10)
            if (Number.isFinite(parsed) && parsed !== rarity) {
              onRarityChange(parsed)
            }
          }}
        >
          {RARITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{t({ zh: opt.zh, en: opt.en })}</option>
          ))}
        </select>
      </label>
      <label className="planner-hypothetical-equipment__field">
        <span>{t({ zh: '附魔等级', en: 'Enchant' })}</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          className="planner-stack-count__input"
          value={draft}
          aria-label={t({ zh: '假设装备附魔等级', en: 'Hypothetical gear enchant' })}
          data-testid="planner-hypothetical-equipment-enchant"
          onChange={(event) => {
            const raw = event.target.value
            setDraft(raw)
            const parsed = Number.parseInt(raw, 10)
            if (Number.isFinite(parsed) && parsed >= 0 && parsed !== enchant) {
              onEnchantChange(parsed)
            }
          }}
        />
      </label>
    </fieldset>
  )
}
