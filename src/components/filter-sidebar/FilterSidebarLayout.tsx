import { useId, type CSSProperties, type ReactNode } from 'react'
import { SidebarToggleIcon } from '../../app/AppIcons'
import { useI18n } from '../../app/i18n'
import { useFilterSidebarCollapse } from './useFilterSidebarCollapse'

interface FilterSidebarLayoutProps {
  storageKey: string
  sidebar: ReactNode
  children: ReactNode
  toolbar?: ReactNode
  className?: string
  contentClassName?: string
  style?: CSSProperties
}

export function FilterSidebarLayout({
  storageKey,
  sidebar,
  children,
  toolbar,
  className,
  contentClassName,
  style,
}: FilterSidebarLayoutProps) {
  const { t } = useI18n()
  const sidebarId = useId()
  const { isCollapsed, toggleCollapsed } = useFilterSidebarCollapse(storageKey)
  const rootClassName = ['filter-workspace', className, isCollapsed ? 'filter-workspace--collapsed' : null]
    .filter(Boolean)
    .join(' ')
  const contentRootClassName = ['filter-workspace__content', contentClassName].filter(Boolean).join(' ')
  const toggleLabel = isCollapsed
    ? t({ zh: '展开筛选栏', en: 'Open filters' })
    : t({ zh: '收起筛选栏', en: 'Collapse filters' })
  const toggleNote = isCollapsed
    ? t({ zh: '给结果区更多横向空间', en: 'Give the results more width' })
    : t({ zh: '保留当前条件，先专注右侧结果', en: 'Keep the filters and focus on the results' })

  return (
    <div className={rootClassName} style={style} data-filter-sidebar-collapsed={isCollapsed ? 'true' : 'false'}>
      <div className="filter-workspace__topbar">
        <button
          type="button"
          className="filter-workspace__toggle"
          onClick={toggleCollapsed}
          aria-expanded={!isCollapsed}
          aria-controls={sidebarId}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          <span className="filter-workspace__toggle-icon" aria-hidden="true">
            <SidebarToggleIcon isCollapsed={isCollapsed} />
          </span>
          <span className="filter-workspace__toggle-copy" aria-hidden="true">
            <strong className="filter-workspace__toggle-title">{toggleLabel}</strong>
            <span className="filter-workspace__toggle-note">{toggleNote}</span>
          </span>
        </button>

        {toolbar !== undefined ? <div className="filter-workspace__toolbar-slot">{toolbar}</div> : null}
      </div>

      <div className="filter-workspace__layout">
        <aside className="filter-workspace__sidebar">
          <div className="filter-workspace__sidebar-sticky">
            <div className="filter-workspace__sidebar-body">
              <div id={sidebarId} className="filter-workspace__sidebar-frame" aria-hidden={isCollapsed}>
                {sidebar}
              </div>
            </div>
          </div>
        </aside>
        <div className={contentRootClassName}>{children}</div>
      </div>
    </div>
  )
}
