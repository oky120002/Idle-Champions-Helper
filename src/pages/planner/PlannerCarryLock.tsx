import { useI18n } from '../../app/i18n'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { Champion } from '../../domain/types'

interface PlannerCarryLockProps {
  championById: Map<string, Champion>
  value: string | null
  onChange: (heroId: string | null) => void
}

/**
 * 指定核心输出位：列出所有英雄（不限 dps 角色），选中后 engine 强制该英雄作 carry。
 */
export function PlannerCarryLock({ championById, value, onChange }: PlannerCarryLockProps) {
  const { t, locale } = useI18n()
  const champions = [...championById.values()]
    .sort((left, right) => left.seat - right.seat || left.id.localeCompare(right.id))

  return (
    <section className="surface-card planner-carry-lock" aria-label={t({ zh: '指定核心输出位', en: 'Lock carry' })}>
      <div className="surface-card__body">
        <label className="planner-carry-lock__label" htmlFor="planner-carry-lock-select">
          {t({ zh: '指定核心输出位（所有英雄）', en: 'Lock carry (all champions)' })}
        </label>
        <select
          id="planner-carry-lock-select"
          className="slot-select"
          data-testid="planner-carry-lock-select"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value || null)}
        >
          <option value="">{t({ zh: '不指定（自动推荐）', en: 'Auto (no lock)' })}</option>
          {champions.map((champion) => (
            <option key={champion.id} value={champion.id}>
              {`${getPrimaryLocalizedText(champion.name, locale)} · Seat ${champion.seat}`}
            </option>
          ))}
        </select>
      </div>
    </section>
  )
}
