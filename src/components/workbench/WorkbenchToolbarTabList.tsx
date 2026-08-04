import type { ReactNode } from 'react'

interface WorkbenchToolbarTabListItem {
  id: string
  label: ReactNode
  controlsId?: string
}

interface WorkbenchToolbarTabListProps {
  value: string
  items: WorkbenchToolbarTabListItem[]
  ariaLabel: string
  onChange: (value: string) => void
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
            aria-pressed={isActive}
            className={
              isActive
                ? 'workbench-page__toolbar-tab workbench-page__toolbar-tab--active'
                : 'workbench-page__toolbar-tab'
            }
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
