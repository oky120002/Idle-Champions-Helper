import type { ReactNode } from 'react'

interface WorkbenchToolbarTabListItem {
  readonly id: string
  readonly label: ReactNode
  readonly controlsId?: string
}

interface WorkbenchToolbarTabListProps {
  readonly value: string
  readonly items: WorkbenchToolbarTabListItem[]
  readonly ariaLabel: string
  readonly onChange: (value: string) => void
}

export function WorkbenchToolbarTabList({
  value,
  items,
  ariaLabel,
  onChange,
}: WorkbenchToolbarTabListProps) {
  return (
    <div className="workbench-page__toolbar-tablist" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = value === item.id

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`toolbar-tab-${item.id}`}
            {...(item.controlsId !== undefined ? { 'aria-controls': item.controlsId } : {})}
            aria-selected={isActive}
            className={
              isActive
                ? 'workbench-page__toolbar-tab workbench-page__toolbar-tab--active'
                : 'workbench-page__toolbar-tab'
            }
            onClick={() => { onChange(item.id); }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
