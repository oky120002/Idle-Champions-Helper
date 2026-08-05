import type { ReactNode, RefObject } from 'react'
import { PageWorkbenchShell } from './PageWorkbenchShell'
import { WorkbenchFloatingTopButton } from './WorkbenchFloatingTopButton'
import {
  renderWorkbenchToolbarSection,
  resolveWorkbenchToolbarSlotConfig,
  type WorkbenchToolbarConfig,
} from './workbenchToolbarConfig'

interface ConfiguredWorkbenchPageFloatingTopButtonConfig {
  readonly onClick: () => void
  readonly detailLabel?: string
}

interface ConfiguredWorkbenchPageProps {
  readonly pageClassName: string
  readonly storageKey: string
  readonly ariaLabel: string
  readonly shellClassName: string
  readonly contentScrollRef?: RefObject<HTMLDivElement | null> | undefined
  readonly contentOverlay?: ReactNode | undefined
  readonly floatingTopButton?: ConfiguredWorkbenchPageFloatingTopButtonConfig | undefined
  readonly toolbar: WorkbenchToolbarConfig
  readonly sidebarHeader?: ReactNode | undefined
  readonly sidebar?: ReactNode | undefined
  readonly contentHeader?: ReactNode | undefined
  readonly children: ReactNode
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
  const floatingTopDetailLabelProp = floatingTopButton?.detailLabel !== undefined
    ? { detailLabel: floatingTopButton.detailLabel }
    : {}
  const resolvedContentOverlay = contentOverlay ?? (
    floatingTopButton !== undefined ? (
      <WorkbenchFloatingTopButton
        onClick={floatingTopButton.onClick}
        {...floatingTopDetailLabelProp}
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
