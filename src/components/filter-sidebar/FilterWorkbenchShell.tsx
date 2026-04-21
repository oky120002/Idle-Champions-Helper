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
  const toggleHint = isCollapsed
    ? t({ zh: '恢复左侧筛选台', en: 'Restore the left filter rail' })
    : t({ zh: '让主画布吃满宽度', en: 'Let the main canvas take the full width' })

  return (
    <section
      className={shellClassName}
      data-filter-sidebar-collapsed={isCollapsed ? 'true' : 'false'}
      aria-label={t({ zh: '英雄筛选工作台', en: 'Champion filter workbench' })}
    >
      {isCollapsed ? (
        <button
          type="button"
          className="filter-workspace__toggle filter-workbench__toggle filter-workbench__collapsed-toggle"
          onClick={toggleCollapsed}
          aria-expanded={!isCollapsed}
          aria-controls={sidebarId}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          <span className="filter-workspace__toggle-icon filter-workbench__toggle-icon" aria-hidden="true">
            <SidebarToggleIcon isCollapsed={isCollapsed} />
          </span>
          <span className="filter-workspace__toggle-copy filter-workbench__toggle-copy">
            <strong className="filter-workspace__toggle-title filter-workbench__toggle-title">{toggleLabel}</strong>
            <span className="filter-workspace__toggle-note filter-workbench__toggle-note">{toggleHint}</span>
          </span>
        </button>
      ) : null}

      <div className="filter-workbench__body">
        <aside className="filter-workbench__pane filter-workbench__pane--sidebar filter-workbench__sidebar">
          <div className="filter-workbench__chrome filter-workbench__chrome-sidebar">
            {!isCollapsed ? (
              <button
                type="button"
                className="filter-workspace__toggle filter-workbench__toggle"
                onClick={toggleCollapsed}
                aria-expanded={!isCollapsed}
                aria-controls={sidebarId}
                aria-label={toggleLabel}
                title={toggleLabel}
              >
                <span className="filter-workspace__toggle-icon filter-workbench__toggle-icon" aria-hidden="true">
                  <SidebarToggleIcon isCollapsed={isCollapsed} />
                </span>
                <span className="filter-workspace__toggle-copy filter-workbench__toggle-copy">
                  <strong className="filter-workspace__toggle-title filter-workbench__toggle-title">{toggleLabel}</strong>
                  <span className="filter-workspace__toggle-note filter-workbench__toggle-note">{toggleHint}</span>
                </span>
              </button>
            ) : null}
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
