import type { ReactNode, RefObject } from 'react'
import { StatusBannerStack, type StatusBannerStackItem } from '../StatusBannerStack'
import { PageWorkbenchShell } from './PageWorkbenchShell'
import {
  WorkbenchSidebarHeader,
  WorkbenchSidebarLoading,
} from './WorkbenchScaffold'
import { WorkbenchSidebarFilterActions } from './WorkbenchSidebarFilterActions'

interface FilterWorkbenchPageSidebarHeaderConfig {
  kicker: ReactNode
  title: ReactNode
  description: ReactNode
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
  contentOverlay?: ReactNode
  toolbarLead?: ReactNode
  toolbarPrimary: ReactNode
  toolbarActions?: ReactNode
  sidebarHeader: FilterWorkbenchPageSidebarHeaderConfig
  isReady: boolean
  sidebar: ReactNode
  contentHeader?: ReactNode
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
  toolbarLead,
  toolbarPrimary,
  toolbarActions,
  sidebarHeader,
  isReady,
  sidebar,
  contentHeader,
  statusItems,
  children,
}: FilterWorkbenchPageProps) {
  return (
    <div className={`${pageClassName} workbench-page`}>
      <PageWorkbenchShell
        storageKey={storageKey}
        ariaLabel={ariaLabel}
        className={shellClassName}
        {...(contentScrollRef !== undefined ? { contentScrollRef } : {})}
        contentOverlay={contentOverlay}
        toolbarLead={toolbarLead}
        toolbarPrimary={toolbarPrimary}
        toolbarActions={toolbarActions}
        sidebarHeader={(
          <WorkbenchSidebarHeader
            kicker={sidebarHeader.kicker}
            title={sidebarHeader.title}
            description={sidebarHeader.description}
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
