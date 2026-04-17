import type { ReactNode } from 'react'
import { FieldGroup } from '../FieldGroup'

interface FilterSegmentedOption<T extends string> {
  value: T
  label: ReactNode
}

interface FilterSegmentedFieldProps<T extends string> {
  label: ReactNode
  value: T
  options: Array<FilterSegmentedOption<T>>
  onChange: (value: T) => void
  groupLabel: string
  hint?: ReactNode
  className?: string
}

export function FilterSegmentedField<T extends string>({
  label,
  value,
  options,
  onChange,
  groupLabel,
  hint,
  className = 'filter-group',
}: FilterSegmentedFieldProps<T>) {
  return (
    <FieldGroup label={label} hint={hint} className={className}>
      <div className="segmented-control" role="group" aria-label={groupLabel}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              value === option.value
                ? 'segmented-control__button segmented-control__button--active'
                : 'segmented-control__button'
            }
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </FieldGroup>
  )
}
