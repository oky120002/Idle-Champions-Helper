import type { ReactNode } from 'react'
import { FieldGroup } from '../FieldGroup'

interface FilterChipSingleSelectOption<T extends string> {
  value: T
  label: ReactNode
  count?: number
}

interface FilterChipSingleSelectFieldProps<T extends string> {
  label: ReactNode
  value: T
  options: Array<FilterChipSingleSelectOption<T>>
  onChange: (value: T) => void
  groupLabel: string
  hint?: ReactNode
  className?: string
}

export function FilterChipSingleSelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  groupLabel,
  hint,
  className = 'filter-group',
}: FilterChipSingleSelectFieldProps<T>) {
  return (
    <FieldGroup label={label} hint={hint} className={className}>
      <div className="filter-chip-grid" role="group" aria-label={groupLabel}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? 'filter-chip filter-chip--active' : 'filter-chip'}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {option.count !== undefined ? <span className="filter-chip__count">{option.count}</span> : null}
          </button>
        ))}
      </div>
    </FieldGroup>
  )
}
