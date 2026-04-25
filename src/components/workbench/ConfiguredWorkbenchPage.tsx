import type { ReactNode, RefObject } from 'react'
import { PageWorkbenchShell } from './PageWorkbenchShell'
import { WorkbenchFloatingTopButton } from './WorkbenchFloatingTopButton'
import {
  WorkbenchToolbarCopy,
  WorkbenchToolbarMark,
  type WorkbenchAccentTone,
} from './WorkbenchScaffold'
import { WorkbenchToolbarItems, type WorkbenchToolbarItemConfig } from './WorkbenchToolbarItems'

interface ConfiguredWorkbenchPageToolbarMarkConfig {
  label: string
  accentTone?: WorkbenchAccentTone
}

interface ConfiguredWorkbenchPageToolbarCopyConfig {
  kicker: ReactNode
  title: ReactNode
  detail?: ReactNode
}

interface ConfiguredWorkbenchPageToolbarIntroConfig {
  mark?: ConfiguredWorkbenchPageToolbarMarkConfig
  copy?: ConfiguredWorkbenchPageToolbarCopyConfig
}

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
  toolbarIntro?: ConfiguredWorkbenchPageToolbarIntroConfig | undefined
  toolbarLead?: ReactNode | undefined
  toolbarPrimary?: ReactNode | undefined
  toolbarItems?: WorkbenchToolbarItemConfig[] | undefined
  toolbarItemsLayout?: 'inline' | 'cluster' | undefined
  toolbarActions?: ReactNode | undefined
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
  toolbarIntro,
  toolbarLead,
  toolbarPrimary,
  toolbarItems,
  toolbarItemsLayout = 'inline',
  toolbarActions,
  sidebarHeader,
  sidebar,
  contentHeader,
  children,
}: ConfiguredWorkbenchPageProps) {
  const resolvedToolbarLead = toolbarLead ?? (
    toolbarIntro?.mark !== undefined ? (
      <WorkbenchToolbarMark
        label={toolbarIntro.mark.label}
        {...(toolbarIntro.mark.accentTone !== undefined ? { accentTone: toolbarIntro.mark.accentTone } : {})}
      />
    ) : null
  )
  const resolvedToolbarPrimary = toolbarPrimary ?? (
    toolbarIntro?.copy !== undefined ? (
      <WorkbenchToolbarCopy
        kicker={toolbarIntro.copy.kicker}
        title={toolbarIntro.copy.title}
        {...(toolbarIntro.copy.detail !== undefined ? { detail: toolbarIntro.copy.detail } : {})}
      />
    ) : null
  )
  const resolvedToolbarActions = toolbarActions ?? (
    toolbarItems !== undefined ? <WorkbenchToolbarItems items={toolbarItems} layout={toolbarItemsLayout} /> : null
  )
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
