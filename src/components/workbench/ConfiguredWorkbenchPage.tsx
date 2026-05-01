import type { ReactNode, RefObject } from 'react'
import { PageWorkbenchShell } from './PageWorkbenchShell'
import { WorkbenchFloatingTopButton } from './WorkbenchFloatingTopButton'
import {
  renderWorkbenchToolbarSection,
  resolveWorkbenchToolbarSlotConfig,
  type WorkbenchToolbarConfig,
} from './workbenchToolbarConfig'

interface ConfiguredWorkbenchPageFloatingTopButtonConfig {
  onClick: () => void
  detailLabel?: string
}

interface ConfiguredWorkbenchPageProps {
  pageClassName: string
  storageKey: string
  ariaLabel: string
  shellClassName: string
  contentScrollRef?: RefObject<HTMLDivElement | null> | undefined
  contentOverlay?: ReactNode | undefined
  floatingTopButton?: ConfiguredWorkbenchPageFloatingTopButtonConfig | undefined
  toolbar: WorkbenchToolbarConfig
  sidebarHeader?: ReactNode | undefined
  sidebar?: ReactNode | undefined
  contentHeader?: ReactNode | undefined
  children: ReactNode
}

export function ConfiguredWorkbenchPage({
  pageClassName,
  storageKey,
  ariaLabel,
  shellClassName,
  contentScrollRef,
  contentOverlay,
  floatingTopButton,
  toolbar,
  sidebarHeader,
  sidebar,
  contentHeader,
  children,
}: ConfiguredWorkbenchPageProps) {
  const resolvedToolbarLead = renderWorkbenchToolbarSection(resolveWorkbenchToolbarSlotConfig(toolbar, 'lead'), 'lead')
  const resolvedToolbarPrimary = renderWorkbenchToolbarSection(resolveWorkbenchToolbarSlotConfig(toolbar, 'primary'), 'primary')
  const resolvedToolbarActions = renderWorkbenchToolbarSection(resolveWorkbenchToolbarSlotConfig(toolbar, 'actions'), 'actions')
  const resolvedContentOverlay = contentOverlay ?? (
    floatingTopButton !== undefined ? (
      <WorkbenchFloatingTopButton
        onClick={floatingTopButton.onClick}
        {...(floatingTopButton.detailLabel !== undefined ? { detailLabel: floatingTopButton.detailLabel } : {})}
      />
    ) : null
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
        {...(sidebarHeader !== undefined ? { sidebarHeader } : {})}
        {...(sidebar !== undefined ? { sidebar } : {})}
        {...(contentHeader !== undefined ? { contentHeader } : {})}
      >
        {children}
      </PageWorkbenchShell>
    </div>
  )
}
