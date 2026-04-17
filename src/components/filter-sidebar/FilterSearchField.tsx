import type { ReactNode } from 'react'
import { FieldGroup } from '../FieldGroup'

interface FilterSearchFieldProps {
  label: ReactNode
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  placeholder?: string
  className?: string
  type?: 'search' | 'text'
}

export function FilterSearchField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  className = 'filter-group',
  type = 'search',
}: FilterSearchFieldProps) {
  return (
    <FieldGroup label={label} hint={hint} as="label" className={className}>
      <input
        className="text-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldGroup>
  )
}
