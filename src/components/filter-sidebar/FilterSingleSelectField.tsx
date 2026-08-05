import type { ReactNode } from 'react'
import { FieldGroup } from '../FieldGroup'

interface FilterSingleSelectOption<T extends string> {
  value: T
  label: ReactNode
}

interface FilterSingleSelectFieldProps<T extends string> {
  readonly label: ReactNode
  readonly value: T
  readonly options: Array<FilterSingleSelectOption<T>>
  readonly onChange: (value: T) => void
  readonly hint?: ReactNode
  readonly className?: string
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
