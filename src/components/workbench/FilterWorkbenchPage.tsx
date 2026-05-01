import type { ReactNode, RefObject } from 'react'
import { StatusBannerStack, type StatusBannerStackItem } from '../StatusBannerStack'
import { PageWorkbenchShell } from './PageWorkbenchShell'
import { WorkbenchFloatingTopButton } from './WorkbenchFloatingTopButton'
import {
  WorkbenchSidebarHeader,
  WorkbenchSidebarLoading,
} from './WorkbenchScaffold'
import { WorkbenchSidebarFilterActions } from './WorkbenchSidebarFilterActions'
import {
  renderWorkbenchToolbarSection,
  resolveWorkbenchToolbarSlotConfig,
  type WorkbenchToolbarConfig,
} from './workbenchToolbarConfig'

interface FilterWorkbenchPageFloatingTopButtonConfig {
  onClick: () => void
}

interface FilterWorkbenchPageSidebarHeaderConfig {
  kicker: ReactNode
  title?: ReactNode
  description?: ReactNode
  statusLabel: string
  activeCount: number
  clearLabel: string
  onClear?: (() => void) | undefined
}

interface FilterWorkbenchPageProps {
  pageClassName: string
  storageKey: string
  ariaLabel: string
  shellClassName: string
  contentScrollRef?: RefObject<HTMLDivElement | null> | undefined
  contentOverlay?: ReactNode | undefined
  floatingTopButton?: FilterWorkbenchPageFloatingTopButtonConfig | undefined
  toolbar: WorkbenchToolbarConfig
  sidebarHeader: FilterWorkbenchPageSidebarHeaderConfig
  isReady: boolean
  sidebar: ReactNode
  contentHeader?: ReactNode | undefined
  statusItems: StatusBannerStackItem[]
  children: ReactNode
}

export function FilterWorkbenchPage({
  pageClassName,
  storageKey,
  ariaLabel,
  shellClassName,
  contentScrollRef,
  contentOverlay,
  floatingTopButton,
  toolbar,
  sidebarHeader,
  isReady,
  sidebar,
  contentHeader,
  statusItems,
  children,
}: FilterWorkbenchPageProps) {
  const resolvedToolbarLead = renderWorkbenchToolbarSection(resolveWorkbenchToolbarSlotConfig(toolbar, 'lead'), 'lead')
  const resolvedToolbarPrimary = renderWorkbenchToolbarSection(resolveWorkbenchToolbarSlotConfig(toolbar, 'primary'), 'primary')
  const resolvedToolbarActions = renderWorkbenchToolbarSection(resolveWorkbenchToolbarSlotConfig(toolbar, 'actions'), 'actions')
  const resolvedContentOverlay = contentOverlay ?? (
    floatingTopButton !== undefined ? <WorkbenchFloatingTopButton onClick={floatingTopButton.onClick} /> : null
  )

  return (
    <div className={`${pageClassName} workbench-page`}>
      <PageWorkbenchShell
        storageKey={storageKey}
        ariaLabel={ariaLabel}
        className={shellClassName}
        {...(contentScrollRef !== undefined ? { contentScrollRef } : {})}
        contentOverlay={resolvedContentOverlay}
        toolbarLead={resolvedToolbarLead}
        toolbarPrimary={resolvedToolbarPrimary}
        toolbarActions={resolvedToolbarActions}
        sidebarHeader={(
          <WorkbenchSidebarHeader
            kicker={sidebarHeader.kicker}
            {...(sidebarHeader.title !== undefined ? { title: sidebarHeader.title } : {})}
            {...(sidebarHeader.description !== undefined ? { description: sidebarHeader.description } : {})}
            statusLabel={sidebarHeader.statusLabel}
            status={(
              <WorkbenchSidebarFilterActions
                activeCount={sidebarHeader.activeCount}
                clearLabel={sidebarHeader.clearLabel}
                {...(sidebarHeader.onClear !== undefined ? { onClear: sidebarHeader.onClear } : {})}
              />
            )}
          />
        )}
        sidebar={isReady ? sidebar : <WorkbenchSidebarLoading />}
        contentHeader={isReady ? contentHeader : null}
      >
        <StatusBannerStack items={statusItems} />
        {isReady ? children : null}
      </PageWorkbenchShell>
    </div>
  )
}
