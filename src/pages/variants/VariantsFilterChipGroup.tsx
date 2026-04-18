import type { ReactNode } from 'react'

export interface VariantsFilterChipGroupOption {
  key: string | number
  label: ReactNode
  count?: number
  isActive: boolean
  onSelect: () => void
}

interface VariantsFilterChipGroupProps {
  options: VariantsFilterChipGroupOption[]
}

export function VariantsFilterChipGroup({ options }: VariantsFilterChipGroupProps) {
  return (
    <div className="filter-chip-grid">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={option.isActive ? 'filter-chip filter-chip--active' : 'filter-chip'}
          onClick={option.onSelect}
        >
          {option.label}
          {option.count !== undefined ? <span className="variants-filter__count">{option.count}</span> : null}
        </button>
      ))}
    </div>
  )
}
