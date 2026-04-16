import type { ReactNode } from 'react'

function FilterDisclosureChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3.5 6.25 8 10.5l4.5-4.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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
          <FilterDisclosureChevronIcon />
        </span>
      </button>
      <div className="filter-disclosure__panel" aria-hidden={!isExpanded}>
        <div className="filter-disclosure__content">{children}</div>
      </div>
    </section>
  )
}
