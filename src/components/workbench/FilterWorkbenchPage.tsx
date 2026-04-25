import type { ReactNode, RefObject } from 'react'
import { StatusBannerStack, type StatusBannerStackItem } from '../StatusBannerStack'
import { PageWorkbenchShell } from './PageWorkbenchShell'
import { WorkbenchFloatingTopButton } from './WorkbenchFloatingTopButton'
import {
  WorkbenchToolbarCopy,
  WorkbenchToolbarFilterStatus,
  type WorkbenchAccentTone,
  WorkbenchSidebarHeader,
  WorkbenchSidebarLoading,
} from './WorkbenchScaffold'
import { WorkbenchSidebarFilterActions } from './WorkbenchSidebarFilterActions'
import { WorkbenchToolbarItems, type WorkbenchToolbarItemConfig } from './WorkbenchToolbarItems'

interface FilterWorkbenchPageToolbarIntroConfig {
  label: string
  activeCount: number
  accentTone?: WorkbenchAccentTone
  kicker: ReactNode
  title: ReactNode
  detail?: ReactNode
}

interface FilterWorkbenchPageFloatingTopButtonConfig {
  onClick: () => void
}

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
  contentOverlay?: ReactNode | undefined
  floatingTopButton?: FilterWorkbenchPageFloatingTopButtonConfig | undefined
  toolbarIntro?: FilterWorkbenchPageToolbarIntroConfig | undefined
  toolbarLead?: ReactNode | undefined
  toolbarPrimary?: ReactNode | undefined
  toolbarItems?: WorkbenchToolbarItemConfig[] | undefined
  toolbarActions?: ReactNode | undefined
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
  toolbarIntro,
  toolbarLead,
  toolbarPrimary,
  toolbarItems,
  toolbarActions,
  sidebarHeader,
  isReady,
  sidebar,
  contentHeader,
  statusItems,
  children,
}: FilterWorkbenchPageProps) {
  const resolvedToolbarLead = toolbarLead ?? (
    toolbarIntro !== undefined ? (
      <WorkbenchToolbarFilterStatus
        label={toolbarIntro.label}
        activeCount={toolbarIntro.activeCount}
        {...(toolbarIntro.accentTone !== undefined ? { accentTone: toolbarIntro.accentTone } : {})}
      />
    ) : null
  )
  const resolvedToolbarPrimary = toolbarPrimary ?? (
    toolbarIntro !== undefined ? (
      <WorkbenchToolbarCopy
        kicker={toolbarIntro.kicker}
        title={toolbarIntro.title}
        {...(toolbarIntro.detail !== undefined ? { detail: toolbarIntro.detail } : {})}
      />
    ) : null
  )
  const resolvedToolbarActions = toolbarActions ?? (
    toolbarItems !== undefined ? <WorkbenchToolbarItems items={toolbarItems} layout="cluster" /> : null
  )
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
