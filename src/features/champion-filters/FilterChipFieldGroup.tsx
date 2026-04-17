import type { ReactNode } from 'react'
import { FieldGroup } from '../../components/FieldGroup'

interface FilterChipOption<T extends string | number> {
  id: T
  label: ReactNode
}

interface FilterChipFieldGroupProps<T extends string | number> {
  label: ReactNode
  hint?: ReactNode
  options: Array<FilterChipOption<T>>
  selectedValues: T[]
  onReset: () => void
  onToggle: (value: T) => void
  allLabel: ReactNode
  className?: string
}

export function FilterChipFieldGroup<T extends string | number>({
  label,
  hint,
  options,
  selectedValues,
  onReset,
  onToggle,
  allLabel,
  className = 'filter-group',
}: FilterChipFieldGroupProps<T>) {
  return (
    <FieldGroup label={label} hint={hint} className={className}>
      <div className="filter-chip-grid">
        <button
          type="button"
          className={selectedValues.length === 0 ? 'filter-chip filter-chip--active' : 'filter-chip'}
          aria-pressed={selectedValues.length === 0}
          onClick={onReset}
        >
          {allLabel}
        </button>
        {options.map((option) => (
          <button
            key={String(option.id)}
            type="button"
            className={selectedValues.includes(option.id) ? 'filter-chip filter-chip--active' : 'filter-chip'}
            aria-pressed={selectedValues.includes(option.id)}
            onClick={() => onToggle(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </FieldGroup>
  )
}
