import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface FilterDisclosureSectionProps {
  title: string
  summary: string
  status: string
  isExpanded: boolean
  onToggle: () => void
  children: ReactNode
}

export function FilterDisclosureSection(props: FilterDisclosureSectionProps) {
  const { title, summary, status, isExpanded, onToggle, children } = props

  return (
    <section className={isExpanded ? 'filter-disclosure filter-disclosure--expanded' : 'filter-disclosure'}>
      <button type="button" className="filter-disclosure__toggle" onClick={onToggle} aria-expanded={isExpanded}>
        <div className="filter-disclosure__copy">
          <div className="filter-disclosure__title-row">
            <strong className="filter-disclosure__title">{title}</strong>
            <span className="filter-disclosure__status">{status}</span>
          </div>
          <span className="filter-disclosure__summary">{summary}</span>
        </div>
        <span className="filter-disclosure__chevron" aria-hidden="true">
          <ChevronDown aria-hidden="true" strokeWidth={1.8} />
        </span>
      </button>
      <div className="filter-disclosure__panel" aria-hidden={!isExpanded}>
        <div className="filter-disclosure__content">{children}</div>
      </div>
    </section>
  )
}
