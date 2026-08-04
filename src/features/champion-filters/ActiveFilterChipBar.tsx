import { useI18n } from '../../app/i18n'
import type { ActiveFilterChip } from './types'

interface ActiveFilterChipBarProps {
  chips: ActiveFilterChip[]
  onClearChip: (id: string) => void
  title?: string
  hint?: string
}

export function ActiveFilterChipBar({
  chips,
  onClearChip,
  title,
  hint,
}: ActiveFilterChipBarProps) {
  const { t } = useI18n()

  if (chips.length === 0) {
    return null
  }

  return (
    <div className="active-filter-bar active-filter-bar--sidebar">
      <div className="active-filter-bar__header">
        <div className="active-filter-bar__copy">
          <strong className="active-filter-bar__title">
            {title ?? t({ zh: '已选条件', en: 'Selected filters' })}
          </strong>
          <p className="active-filter-bar__hint">
            {hint ??
              t({
                zh: '点击任一条件即可单独回退对应维度。',
                en: 'Click any filter chip to clear that dimension only.',
              })}
          </p>
        </div>
      </div>
      <div className="active-filter-bar__chips">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="active-filter-chip"
            aria-label={chip.clearLabel}
            onClick={() => onClearChip(chip.id)}
          >
            <span>{chip.label}</span>
            <span aria-hidden="true" className="active-filter-chip__dismiss">
              ×
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
