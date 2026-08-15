import { useI18n } from '../../app/i18n'
import type { DamageSourcePattern } from '../../domain/planner/plannerModel'
import type { FormationSlot } from '../../domain/types'

interface PlannerDamageSlotsProps {
  readonly slots: FormationSlot[]
  readonly disabledSlots: readonly string[]
  readonly onToggle: (slotId: string) => void
  readonly damageSourcePattern: DamageSourcePattern | null
  readonly referenceHeroName: string | null
}

function getColumnSpan(value: number | undefined, fallback: number): number {
  return value != null && Number.isInteger(value) && value > 0 ? value : fallback
}

function selfSuffix(
  pattern: DamageSourcePattern,
  t: ReturnType<typeof useI18n>['t'],
): string {
  return t(pattern.includeReference ? '（含参考英雄自身）' : '（不含参考英雄自身）')
}

function getDamageSourcePatternCopy(
  pattern: DamageSourcePattern,
  referenceHeroName: string,
  t: ReturnType<typeof useI18n>['t'],
): string {
  switch (pattern.kind) {
    case 'same-column':
      return t('系统解析：核心英雄须与{p0}同列。', { p0: referenceHeroName })
    case 'adjacent':
      return t('系统解析：核心英雄须位于{p0}相邻槽位{p1}。', { p0: referenceHeroName, p1: selfSuffix(pattern, t) })
    case 'not-adjacent':
      return t('系统解析：核心英雄不能位于{p0}相邻槽位{p1}。', { p0: referenceHeroName, p1: selfSuffix(pattern, t) })
    case 'within-slots':
      return t('系统解析：核心英雄须位于{p0}{p1}格以内{p2}。', {
        p0: referenceHeroName, p1: String(pattern.slotSpan ?? 2), p2: selfSuffix(pattern, t),
      })
    case 'front-columns':
      return t('系统解析：核心英雄须位于{p0}前方{p1}列{p2}。', {
        p0: referenceHeroName, p1: String(getColumnSpan(pattern.columnSpan, 2)), p2: selfSuffix(pattern, t),
      })
    case 'behind-columns':
      return t('系统解析：核心英雄须位于{p0}后方{p1}列{p2}。', {
        p0: referenceHeroName, p1: String(getColumnSpan(pattern.columnSpan, 1)), p2: selfSuffix(pattern, t),
      })
  }
}

/**
 * 伤害来源限制（UI 层 2）：用户手动标记哪些槽位不能造伤害。
 * 默认全部可打——用户只做减法。核心英雄放在标记的槽位时 DPS 归零。
 */
export function PlannerDamageSlots({
  slots,
  disabledSlots,
  onToggle,
  damageSourcePattern,
  referenceHeroName,
}: PlannerDamageSlotsProps) {
  const { t } = useI18n()
  if (slots.length === 0) return null
  const disabledSet = new Set(disabledSlots)
  const patternCopy = damageSourcePattern != null && referenceHeroName != null
    ? getDamageSourcePatternCopy(damageSourcePattern, referenceHeroName, t)
    : null

  return (
    <section className="surface-card planner-slot-lock" aria-label={t("伤害来源限制")} data-testid="planner-damage-slots">
      <div className="surface-card__header">
        <div className="surface-card__header-copy">
          <p className="surface-card__eyebrow">{t("伤害来源限制")}</p>
          <h3 className="surface-card__title">{t("标记不能造伤害的格子")}</h3>
          <p className="surface-card__description">
            {t("有些变体限制了哪些位置能打伤害。默认都能打，手动标记不能打伤害的格子后，核心英雄不会放在这些位置。")}
          </p>
          {patternCopy != null ? (
            <p className="planner-slot-lock__system-rule" data-testid="planner-damage-source-pattern">
              {patternCopy}
            </p>
          ) : null}
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
