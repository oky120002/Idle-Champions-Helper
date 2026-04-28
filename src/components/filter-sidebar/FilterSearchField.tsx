import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
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
      <span className="text-input-shell text-input-shell--search">
        <Search className="text-input-shell__icon" aria-hidden="true" strokeWidth={1.8} />
        <input
          className="text-input text-input--with-leading-icon"
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </FieldGroup>
  )
}
