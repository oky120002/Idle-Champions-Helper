import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { SidebarToggleIcon } from '../../app/AppIcons'
import { useI18n } from '../../app/i18n'
import { WorkbenchToolbarActionButton } from './WorkbenchToolbarActionButton'
import { useWorkbenchSidebarCollapse } from './useWorkbenchSidebarCollapse'

const DESKTOP_SIDEBAR_ANIMATION_MS = 340
const OPENING_WIDTH_LOCK_RELEASE_MS = 240

function shouldAnimateSidebarLayout(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return (
    window.matchMedia('(min-width: 1080px)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

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

type ToolbarRegion = 'lead' | 'primary' | 'actions'

interface ToolbarRegionSlotProps {
  region: ToolbarRegion
  children?: ReactNode
  className?: string
}

function renderToolbarRegionSlot({
  region,
  children,
  className,
}: ToolbarRegionSlotProps) {
  if (children === undefined || children === null) {
    return null
  }

  return (
    <div
      className={[
        'page-workbench__toolbar-region',
        `page-workbench__toolbar-region--${region}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
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
  const { isCollapsed, setCollapsed } = useWorkbenchSidebarCollapse(storageKey)
  const [isLayoutCollapsed, setIsLayoutCollapsed] = useState(isCollapsed)
  const [isLayoutSyncing, setIsLayoutSyncing] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationTimeoutRef = useRef<number | null>(null)
  const openingWidthReleaseTimeoutRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isSidebarCollapsed = hasSidebar ? isCollapsed : false
  const clearPendingAnimation = useCallback(() => {
    if (animationTimeoutRef.current !== null) {
      window.clearTimeout(animationTimeoutRef.current)
      animationTimeoutRef.current = null
    }

    if (openingWidthReleaseTimeoutRef.current !== null) {
      window.clearTimeout(openingWidthReleaseTimeoutRef.current)
      openingWidthReleaseTimeoutRef.current = null
    }

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  useEffect(() => clearPendingAnimation, [clearPendingAnimation])

  const toggleCollapsed = useCallback(() => {
    if (!hasSidebar || isAnimating) {
      return
    }

    const nextCollapsed = !isCollapsed

    if (!shouldAnimateSidebarLayout()) {
      clearPendingAnimation()
      setCollapsed(nextCollapsed)
      setIsLayoutCollapsed(nextCollapsed)
      setIsLayoutSyncing(false)
      setIsOpening(false)
      setIsAnimating(false)
      return
    }

    clearPendingAnimation()
    setIsAnimating(true)

    if (nextCollapsed) {
      setIsLayoutSyncing(false)
      setIsOpening(false)
      setCollapsed(true)
      animationTimeoutRef.current = window.setTimeout(() => {
        setIsLayoutSyncing(true)
        setIsLayoutCollapsed(true)
        animationTimeoutRef.current = null
        animationFrameRef.current = window.requestAnimationFrame(() => {
          setIsLayoutSyncing(false)
          setIsOpening(false)
          setIsAnimating(false)
          animationFrameRef.current = null
        })
      }, DESKTOP_SIDEBAR_ANIMATION_MS)
      return
    }

    setIsOpening(true)
    setIsLayoutSyncing(true)
    setIsLayoutCollapsed(false)
    animationFrameRef.current = window.requestAnimationFrame(() => {
      setIsLayoutSyncing(false)
      animationFrameRef.current = window.requestAnimationFrame(() => {
        setCollapsed(false)
        openingWidthReleaseTimeoutRef.current = window.setTimeout(() => {
          setIsOpening(false)
          openingWidthReleaseTimeoutRef.current = null
        }, OPENING_WIDTH_LOCK_RELEASE_MS)
        animationTimeoutRef.current = window.setTimeout(() => {
          setIsAnimating(false)
          animationTimeoutRef.current = null
        }, DESKTOP_SIDEBAR_ANIMATION_MS)
        animationFrameRef.current = null
      })
    })
  }, [clearPendingAnimation, hasSidebar, isAnimating, isCollapsed, setCollapsed])

  const shellClassName = [
    'page-workbench',
    hasSidebar && isLayoutCollapsed ? 'page-workbench--layout-collapsed' : '',
    isLayoutSyncing ? 'page-workbench--layout-syncing' : '',
    isOpening ? 'page-workbench--opening' : '',
    isSidebarCollapsed ? 'page-workbench--collapsed' : '',
    isAnimating ? 'page-workbench--animating' : '',
    hasSidebar ? '' : 'page-workbench--sidebarless',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const toggleLabel = isSidebarCollapsed
    ? t({ zh: '展开左侧面板', en: 'Open left pane' })
    : t({ zh: '收起左侧面板', en: 'Collapse left pane' })

  const renderToolbarLeadGroup = () => (
    <div className="page-workbench__toolbar-region-group">
      {hasSidebar ? (
        <WorkbenchToolbarActionButton
          onClick={toggleCollapsed}
          icon={<SidebarToggleIcon isCollapsed={isSidebarCollapsed} />}
          iconOnly
          tone="share"
          ariaExpanded={!isSidebarCollapsed}
          ariaControls={sidebarId}
          ariaLabel={toggleLabel}
          title={toggleLabel}
          className={[
            'page-workbench__toolbar-toggle',
            isSidebarCollapsed ? 'page-workbench__toolbar-toggle--collapsed' : 'page-workbench__toolbar-toggle--expanded',
          ].join(' ')}
        >
          {''}
        </WorkbenchToolbarActionButton>
      ) : null}

      {toolbarLead !== undefined ? (
        <div className="page-workbench__toolbar-region-copy">{toolbarLead}</div>
      ) : null}
    </div>
  )

  return (
    <section
      className={shellClassName}
      data-workbench-sidebar={hasSidebar ? 'present' : 'hidden'}
      data-workbench-sidebar-collapsed={isSidebarCollapsed ? 'true' : 'false'}
      aria-label={ariaLabel ?? t({ zh: '页面工作台', en: 'Page workbench' })}
    >
      <div className="page-workbench__body">
        {hasSidebar ? (
          <aside className="page-workbench__pane page-workbench__pane--sidebar page-workbench__sidebar">
            <div className="page-workbench__chrome page-workbench__chrome-sidebar">
              {!isSidebarCollapsed && (hasSidebar || toolbarLead !== undefined) ? (
                renderToolbarRegionSlot({
                  region: 'lead',
                  className: 'page-workbench__toolbar-region--sidebar',
                  children: renderToolbarLeadGroup(),
                })
              ) : null}
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
            {(!hasSidebar && toolbarLead !== undefined) || isSidebarCollapsed ? (
              renderToolbarRegionSlot({
                region: 'lead',
                className: 'page-workbench__toolbar-region--inline',
                children: hasSidebar ? renderToolbarLeadGroup() : toolbarLead,
              })
            ) : null}
            {renderToolbarRegionSlot({ region: 'primary', children: toolbarPrimary })}
            {renderToolbarRegionSlot({ region: 'actions', children: toolbarActions })}
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
