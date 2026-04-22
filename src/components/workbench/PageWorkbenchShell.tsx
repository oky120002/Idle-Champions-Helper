import { useId, type ReactNode, type RefObject } from 'react'
import { SidebarToggleIcon } from '../../app/AppIcons'
import { useI18n } from '../../app/i18n'
import { useWorkbenchSidebarCollapse } from './useWorkbenchSidebarCollapse'

interface PageWorkbenchShellProps {
  storageKey: string
  ariaLabel?: string
  toolbarLead?: ReactNode
  toolbarPrimary: ReactNode
  toolbarActions?: ReactNode
  sidebarHeader?: ReactNode
  sidebar?: ReactNode
  contentHeader?: ReactNode
  contentOverlay?: ReactNode
  children: ReactNode
  className?: string
  contentScrollRef?: RefObject<HTMLDivElement | null>
}

export function PageWorkbenchShell({
  storageKey,
  ariaLabel,
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
}: PageWorkbenchShellProps) {
  const { t } = useI18n()
  const sidebarId = useId()
  const hasSidebar = sidebar !== undefined && sidebar !== null
  const { isCollapsed, toggleCollapsed } = useWorkbenchSidebarCollapse(storageKey)
  const isSidebarCollapsed = hasSidebar ? isCollapsed : false
  const shellClassName = [
    'page-workbench',
    isSidebarCollapsed ? 'page-workbench--collapsed' : '',
    hasSidebar ? '' : 'page-workbench--sidebarless',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const toggleLabel = isSidebarCollapsed
    ? t({ zh: '展开左侧面板', en: 'Open left pane' })
    : t({ zh: '收起左侧面板', en: 'Collapse left pane' })
  const toggleClassName = [
    'page-workbench__toggle',
    'page-workbench__anchor-toggle',
    isSidebarCollapsed ? 'page-workbench__anchor-toggle--collapsed' : 'page-workbench__anchor-toggle--expanded',
  ].join(' ')

  return (
    <section
      className={shellClassName}
      data-workbench-sidebar={hasSidebar ? 'present' : 'hidden'}
      data-workbench-sidebar-collapsed={isSidebarCollapsed ? 'true' : 'false'}
      aria-label={ariaLabel ?? t({ zh: '页面工作台', en: 'Page workbench' })}
    >
      {hasSidebar ? (
        <button
          type="button"
          className={toggleClassName}
          onClick={toggleCollapsed}
          aria-expanded={!isSidebarCollapsed}
          aria-controls={sidebarId}
          aria-label={toggleLabel}
          title={toggleLabel}
          data-state={isSidebarCollapsed ? 'collapsed' : 'expanded'}
        >
          <span className="page-workbench__toggle-icon" aria-hidden="true">
            <SidebarToggleIcon isCollapsed={isSidebarCollapsed} />
          </span>
        </button>
      ) : null}

      <div className="page-workbench__body">
        {hasSidebar ? (
          <aside className="page-workbench__pane page-workbench__pane--sidebar page-workbench__sidebar">
            <div className="page-workbench__chrome page-workbench__chrome-sidebar">
              {toolbarLead !== undefined ? <div className="page-workbench__chrome-lead">{toolbarLead}</div> : null}
            </div>

            <div className="page-workbench__sidebar-shell">
              <div
                id={sidebarId}
                className="page-workbench__sidebar-scroll"
                aria-hidden={isSidebarCollapsed}
              >
                {sidebarHeader !== undefined ? <div className="page-workbench__sidebar-head">{sidebarHeader}</div> : null}
                <div className="page-workbench__sidebar-body">{sidebar}</div>
              </div>
            </div>
          </aside>
        ) : null}

        <div className="page-workbench__pane page-workbench__pane--content page-workbench__content">
          <div className="page-workbench__chrome page-workbench__chrome-main">
            {!hasSidebar && toolbarLead !== undefined ? (
              <div className="page-workbench__chrome-inline-lead">{toolbarLead}</div>
            ) : null}
            <div className="page-workbench__chrome-primary">{toolbarPrimary}</div>
            {toolbarActions !== undefined ? <div className="page-workbench__chrome-actions">{toolbarActions}</div> : null}
          </div>

          <div className="page-workbench__content-shell">
            <div ref={contentScrollRef} className="page-workbench__content-scroll">
              {contentHeader !== undefined ? <div className="page-workbench__content-head">{contentHeader}</div> : null}
              <div className="page-workbench__content-body">{children}</div>
            </div>
            {contentOverlay != null ? <div className="page-workbench__content-overlay">{contentOverlay}</div> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
