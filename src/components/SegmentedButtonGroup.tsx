import type { ReactNode } from 'react'

export interface SegmentedButtonGroupItem<T extends string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

interface SegmentedButtonGroupProps<T extends string> {
  value: T
  items: Array<SegmentedButtonGroupItem<T>>
  ariaLabel: string
  onChange: (value: T) => void
  mode?: 'group' | 'tablist'
  className?: string
}

export function SegmentedButtonGroup<T extends string>({
  value,
  items,
  ariaLabel,
  onChange,
  mode = 'group',
  className = 'segmented-control',
}: SegmentedButtonGroupProps<T>) {
  const isTablist = mode === 'tablist'

  return (
    <div className={className} role={isTablist ? 'tablist' : 'group'} aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = value === item.value

        return (
          <button
            key={item.value}
            type="button"
            className={
              isActive
                ? 'segmented-control__button segmented-control__button--active'
                : 'segmented-control__button'
            }
            {...(isTablist ? { role: 'tab', 'aria-selected': isActive } : { 'aria-pressed': isActive })}
            {...(item.disabled ? { disabled: true } : {})}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
