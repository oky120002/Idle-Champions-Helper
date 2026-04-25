import type { ReactNode } from 'react'
import { FieldGroup } from '../FieldGroup'
import { SegmentedButtonGroup } from '../SegmentedButtonGroup'

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
      <SegmentedButtonGroup
        value={value}
        items={options}
        ariaLabel={groupLabel}
        onChange={onChange}
      />
    </FieldGroup>
  )
}
