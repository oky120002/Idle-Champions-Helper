import type { ReactNode } from 'react'

export interface SegmentedButtonGroupItem<T extends string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

interface SegmentedButtonGroupProps<T extends string> {
  readonly value: T
  readonly items: Array<SegmentedButtonGroupItem<T>>
  readonly ariaLabel: string
  readonly onChange: (value: T) => void
  readonly mode?: 'group' | 'tablist'
  readonly className?: string
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
            {...(item.disabled === true ? { disabled: true } : {})}
            onClick={() => { onChange(item.value); }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
