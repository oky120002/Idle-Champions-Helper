import type { ReactNode } from 'react'
import { FieldGroup } from '../FieldGroup'
import { SegmentedButtonGroup } from '../SegmentedButtonGroup'

interface FilterSegmentedOption<T extends string> {
  value: T
  label: ReactNode
}

interface FilterSegmentedFieldProps<T extends string> {
  readonly label: ReactNode
  readonly value: T
  readonly options: Array<FilterSegmentedOption<T>>
  readonly onChange: (value: T) => void
  readonly groupLabel: string
  readonly hint?: ReactNode
  readonly className?: string
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
