import { useId, type ReactNode, type RefObject } from 'react'
import { SidebarToggleIcon } from '../../app/AppIcons'
import { useI18n } from '../../app/i18n'
import { useFilterSidebarCollapse } from './useFilterSidebarCollapse'

interface FilterWorkbenchShellProps {
  storageKey: string
  toolbarLead?: ReactNode
  toolbarPrimary: ReactNode
  toolbarActions?: ReactNode
  sidebarHeader?: ReactNode
  sidebar: ReactNode
  contentHeader?: ReactNode
  contentOverlay?: ReactNode
  children: ReactNode
  className?: string
  contentScrollRef?: RefObject<HTMLDivElement | null>
}

export function FilterWorkbenchShell({
  storageKey,
  toolbarLead,
  toolbarPrimary,
  toolbarActions,
  sidebarHeader,
  sidebar,
  contentHeader,
  contentOverlay,
  children,
  className,
  contentScrollRef,
}: FilterWorkbenchShellProps) {
  const { t } = useI18n()
  const sidebarId = useId()
  const { isCollapsed, toggleCollapsed } = useFilterSidebarCollapse(storageKey)
  const shellClassName = [
    'filter-workbench',
    'champions-workspace',
    isCollapsed ? 'filter-workbench--collapsed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const toggleLabel = isCollapsed
    ? t({ zh: '展开筛选抽屉', en: 'Open filter drawer' })
    : t({ zh: '收起筛选抽屉', en: 'Collapse filter drawer' })
  const toggleClassName = [
    'filter-workspace__toggle',
    'filter-workbench__toggle',
    'filter-workbench__anchor-toggle',
    isCollapsed ? 'filter-workbench__anchor-toggle--collapsed' : 'filter-workbench__anchor-toggle--expanded',
  ].join(' ')

  return (
    <section
      className={shellClassName}
      data-filter-sidebar-collapsed={isCollapsed ? 'true' : 'false'}
      aria-label={t({ zh: '英雄筛选工作台', en: 'Champion filter workbench' })}
      >
        <button
          type="button"
          className={toggleClassName}
          onClick={toggleCollapsed}
          aria-expanded={!isCollapsed}
          aria-controls={sidebarId}
          aria-label={toggleLabel}
          title={toggleLabel}
          data-state={isCollapsed ? 'collapsed' : 'expanded'}
        >
          <span className="filter-workspace__toggle-icon filter-workbench__toggle-icon" aria-hidden="true">
            <SidebarToggleIcon isCollapsed={isCollapsed} />
          </span>
        </button>

      <div className="filter-workbench__body">
        <aside className="filter-workbench__pane filter-workbench__pane--sidebar filter-workbench__sidebar">
          <div className="filter-workbench__chrome filter-workbench__chrome-sidebar">
            {toolbarLead !== undefined ? <div className="filter-workbench__chrome-lead">{toolbarLead}</div> : null}
          </div>

          <div className="filter-workbench__sidebar-shell">
            <div
              id={sidebarId}
              className="filter-workbench__sidebar-scroll"
              aria-hidden={isCollapsed}
            >
              {sidebarHeader !== undefined ? <div className="filter-workbench__sidebar-head">{sidebarHeader}</div> : null}
              <div className="filter-workbench__sidebar-body">{sidebar}</div>
            </div>
          </div>
        </aside>

        <div className="filter-workbench__pane filter-workbench__pane--content filter-workbench__content">
          <div className="filter-workbench__chrome filter-workbench__chrome-main">
            <div className="filter-workbench__chrome-primary">{toolbarPrimary}</div>
            {toolbarActions !== undefined ? <div className="filter-workbench__chrome-actions">{toolbarActions}</div> : null}
          </div>

          <div className="filter-workbench__content-shell">
            <div ref={contentScrollRef} className="filter-workbench__content-scroll">
              {contentHeader !== undefined ? <div className="filter-workbench__content-head">{contentHeader}</div> : null}
              <div className="filter-workbench__content-body">{children}</div>
            </div>
            {contentOverlay != null ? <div className="filter-workbench__content-overlay">{contentOverlay}</div> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
