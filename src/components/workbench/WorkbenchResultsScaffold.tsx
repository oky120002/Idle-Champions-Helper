import type { ReactNode } from 'react'
import { StatusBanner } from '../StatusBanner'

interface WorkbenchResultsScaffoldProps {
  ariaLabel: string
  sectionClassName: string
  isEmpty: boolean
  emptyState: {
    title?: ReactNode
    detail?: ReactNode
    children?: ReactNode
  }
  children: ReactNode
  shellClassName?: string
  panelClassName?: string
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
  const content = isEmpty ? (
    <div className="results-panel__empty">
      <StatusBanner
        tone="info"
        {...(emptyState.title !== undefined ? { title: emptyState.title } : {})}
        {...(emptyState.detail !== undefined ? { detail: emptyState.detail } : {})}
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
