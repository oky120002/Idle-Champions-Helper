import type { ReactNode } from 'react'
import { StatusBanner } from '../StatusBanner'

interface WorkbenchResultsScaffoldProps {
  readonly ariaLabel: string
  readonly sectionClassName: string
  readonly isEmpty: boolean
  readonly emptyState: {
    readonly title?: ReactNode
    readonly detail?: ReactNode
    readonly children?: ReactNode
  }
  readonly children: ReactNode
  readonly shellClassName?: string
  readonly panelClassName?: string
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
  const emptyStateProps = {
    ...(emptyState.title !== undefined ? { title: emptyState.title } : {}),
    ...(emptyState.detail !== undefined ? { detail: emptyState.detail } : {}),
  }
  const content = isEmpty ? (
    <div className="results-panel__empty">
      <StatusBanner
        tone="info"
        {...emptyStateProps}
      >
        {emptyState.children}
      </StatusBanner>
    </div>
  ) : children

  const panelContent = panelClassName !== undefined ? <div className={panelClassName}>{content}</div> : content
  const sectionContent = shellClassName !== undefined ? <div className={shellClassName}>{panelContent}</div> : panelContent

  return (
    <section className={sectionClassName} aria-label={ariaLabel}>
      {sectionContent}
    </section>
  )
}
