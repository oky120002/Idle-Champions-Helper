import { useI18n } from '../../app/i18n'
import type { FormationSlot } from '../../domain/types'

interface PlannerDamageSlotsProps {
  readonly slots: FormationSlot[]
  readonly disabledSlots: readonly string[]
  readonly onToggle: (slotId: string) => void
}

/**
 * 伤害来源限制（UI 层 2）：用户手动标记哪些槽位不能造伤害。
 * 默认全部可打——用户只做减法。核心英雄放在标记的槽位时 DPS 归零。
 */
export function PlannerDamageSlots({ slots, disabledSlots, onToggle }: PlannerDamageSlotsProps) {
  const { t } = useI18n()
  if (slots.length === 0) return null
  const disabledSet = new Set(disabledSlots)

  return (
    <section className="surface-card planner-slot-lock" aria-label={t("伤害来源限制")} data-testid="planner-damage-slots">
      <div className="surface-card__header">
        <div className="surface-card__header-copy">
          <p className="surface-card__eyebrow">{t("伤害来源限制")}</p>
          <h3 className="surface-card__title">{t("标记不能造伤害的格子")}</h3>
          <p className="surface-card__description">
            {t("有些变体限制了哪些位置能打伤害。默认都能打，手动标记不能打伤害的格子后，核心英雄不会放在这些位置。")}
          </p>
        </div>
      </div>
      <div className="surface-card__body">
        <ul className="planner-slot-lock__list">
          {slots.map((slot) => {
            const isDisabled = disabledSet.has(slot.id)
            return (
              <li key={slot.id} className="planner-slot-lock__item">
                <span className="planner-slot-lock__copy">
                  {t("槽位 {p0}", { p0: slot.id })}
                </span>
                <button
                  type="button"
                  data-testid={`planner-damage-slot-toggle-${slot.id}`}
                  data-disabled={isDisabled}
                  className={isDisabled ? 'is-locked' : ''}
                  onClick={() => onToggle(slot.id)}
                >
                  {isDisabled
                    ? t("不能造伤害")
                    : t("可造伤害")}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
