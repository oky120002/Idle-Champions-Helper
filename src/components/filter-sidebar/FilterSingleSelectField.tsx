import type { ReactNode } from 'react'
import { FieldGroup } from '../FieldGroup'

interface FilterSingleSelectOption<T extends string> {
  value: T
  label: ReactNode
}

interface FilterSingleSelectFieldProps<T extends string> {
  label: ReactNode
  value: T
  options: Array<FilterSingleSelectOption<T>>
  onChange: (value: T) => void
  hint?: ReactNode
  className?: string
}

export function FilterSingleSelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  className = 'filter-group',
}: FilterSingleSelectFieldProps<T>) {
  return (
    <FieldGroup label={label} hint={hint} as="label" className={className}>
      <select className="select-input" value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldGroup>
  )
}
