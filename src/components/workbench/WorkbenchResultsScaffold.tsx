import type { ReactNode } from 'react'
import { StatusBanner } from '../StatusBanner'

interface WorkbenchResultsScaffoldEmptyState {
  readonly title?: ReactNode
  readonly detail?: ReactNode
  readonly children?: ReactNode
}

interface WorkbenchResultsScaffoldProps {
  readonly ariaLabel: string
  readonly sectionClassName: string
  readonly isEmpty: boolean
  readonly emptyState: WorkbenchResultsScaffoldEmptyState
  readonly children: ReactNode
  readonly shellClassName?: string
  readonly panelClassName?: string
}

function renderEmptyState(emptyState: WorkbenchResultsScaffoldEmptyState): ReactNode {
  return (
    <div className="results-panel__empty">
      <StatusBanner
        tone="info"
        {...(emptyState.title !== undefined ? { title: emptyState.title } : {})}
        {...(emptyState.detail !== undefined ? { detail: emptyState.detail } : {})}
      >
        {emptyState.children}
      </StatusBanner>
    </div>
  )
}

export function WorkbenchResultsScaffold({
  ariaLabel,
  sectionClassName,
  isEmpty,
  emptyState,
  children,
  shellClassName,
  panelClassName,
}: WorkbenchResultsScaffoldProps) {
  const content = isEmpty ? renderEmptyState(emptyState) : children

  const panelContent = panelClassName !== undefined ? <div className={panelClassName}>{content}</div> : content
  const sectionContent = shellClassName !== undefined ? <div className={shellClassName}>{panelContent}</div> : panelContent

  return (
    <section className={sectionClassName} aria-label={ariaLabel}>
      {sectionContent}
    </section>
  )
}
