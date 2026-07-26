import { useI18n } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { Champion, FormationSlot } from '../../domain/types'

interface PlannerSlotLockProps {
  slots: FormationSlot[]
  placements: Record<string, string>
  championById: Map<string, Champion>
  lockedSlots: Record<string, string>
  onLock: (slotId: string, heroId: string) => void
  onClearLock: (slotId: string) => void
}

/**
 * 锁槽：对当前结果已填充的槽位逐个锁定/解锁，锁定的 slot→heroId 预填且不被搜索替换。
 */
export function PlannerSlotLock({
  slots,
  placements,
  championById,
  lockedSlots,
  onLock,
  onClearLock,
}: PlannerSlotLockProps) {
  const { t, locale } = useI18n()
  const filledSlots = slots.filter((slot) => placements[slot.id])

  if (filledSlots.length === 0) {
    return null
  }

  return (
    <section className="surface-card planner-slot-lock" aria-label={t({ zh: '锁槽', en: 'Lock slots' })}>
      <div className="surface-card__header">
        <div className="surface-card__header-copy">
          <p className="surface-card__eyebrow">{t({ zh: '锁槽', en: 'Lock slots' })}</p>
          <h3 className="surface-card__title">{t({ zh: '固定槽位英雄', en: 'Pin champions to slots' })}</h3>
        </div>
      </div>
      <div className="surface-card__body">
        <ul className="planner-slot-lock__list" data-testid="planner-slot-lock">
          {filledSlots.map((slot) => {
            const heroId = placements[slot.id]!
            const champion = championById.get(heroId)
            const isLocked = lockedSlots[slot.id] === heroId
            const name = champion ? getPrimaryLocalizedText(champion.name, locale) : heroId

            return (
              <li key={slot.id} className="planner-slot-lock__item">
                <span className="planner-slot-lock__copy">
                  {t({ zh: `槽位 ${slot.id}`, en: `Slot ${slot.id}` })}: {name}
                </span>
                <button
                  type="button"
                  data-testid={`planner-slot-lock-toggle-${slot.id}`}
                  data-locked={isLocked}
                  className={isLocked ? 'is-locked' : ''}
                  onClick={() => (isLocked ? onClearLock(slot.id) : onLock(slot.id, heroId))}
                >
                  {isLocked ? t({ zh: '解锁', en: 'Unlock' }) : t({ zh: '锁定', en: 'Lock' })}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
