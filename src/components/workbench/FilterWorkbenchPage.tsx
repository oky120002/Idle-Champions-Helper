import type { ReactNode, RefObject } from 'react'
import { StatusBannerStack, type StatusBannerStackItem } from '../StatusBannerStack'
import { PageWorkbenchShell } from './PageWorkbenchShell'
import { WorkbenchFloatingTopButton } from './WorkbenchFloatingTopButton'
import {
  type WorkbenchAccentTone,
  WorkbenchSidebarHeader,
  WorkbenchSidebarLoading,
} from './WorkbenchScaffold'
import { WorkbenchSidebarFilterActions } from './WorkbenchSidebarFilterActions'
import { type WorkbenchToolbarItemConfig } from './WorkbenchToolbarItems'
import {
  renderWorkbenchToolbarSection,
  type WorkbenchToolbarConfig,
} from './workbenchToolbarConfig'

interface FilterWorkbenchPageToolbarIntroConfig {
  label: string
  activeCount: number
  accentTone?: WorkbenchAccentTone
  title: ReactNode
  detail?: ReactNode
}

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
  toolbar?: WorkbenchToolbarConfig | undefined
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
  toolbar,
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
  const resolvedToolbarLead = toolbarLead ?? renderWorkbenchToolbarSection(
    toolbar?.lead
    ?? (toolbarIntro !== undefined
      ? {
          kind: 'filter-status',
          label: toolbarIntro.label,
          activeCount: toolbarIntro.activeCount,
          ...(toolbarIntro.accentTone !== undefined ? { accentTone: toolbarIntro.accentTone } : {}),
        }
      : undefined),
  )
  const resolvedToolbarPrimary = toolbarPrimary ?? renderWorkbenchToolbarSection(
    toolbar?.primary
    ?? (toolbarIntro !== undefined
      ? {
          kind: 'copy',
          title: toolbarIntro.title,
          ...(toolbarIntro.detail !== undefined ? { detail: toolbarIntro.detail } : {}),
        }
      : undefined),
  )
  const resolvedToolbarActions = toolbarActions ?? renderWorkbenchToolbarSection(
    toolbar?.actions
    ?? (toolbarItems !== undefined
      ? {
          kind: 'items',
          items: toolbarItems,
          layout: 'cluster',
        }
      : undefined),
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
