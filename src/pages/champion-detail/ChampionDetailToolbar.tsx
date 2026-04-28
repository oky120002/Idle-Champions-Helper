import type { ReactNode } from 'react'
import { WorkbenchToolbarCopy } from '../../components/workbench/WorkbenchScaffold'
import type { DetailSectionLink } from './types'

interface ChampionDetailToolbarPrimaryProps {
  kicker: ReactNode
  title: ReactNode
  detail?: ReactNode
  activeSectionId: DetailSectionLink['id']
  sectionLinks: DetailSectionLink[]
  tabAriaLabel: string
  scrollToSection: (id: string) => void
}

export function ChampionDetailToolbarPrimary({
  kicker,
  title,
  detail,
  activeSectionId,
  sectionLinks,
  tabAriaLabel,
  scrollToSection,
}: ChampionDetailToolbarPrimaryProps) {
  return (
    <div className="champion-detail-toolbar-primary">
      <WorkbenchToolbarCopy
        kicker={kicker}
        title={title}
        {...(detail !== undefined ? { detail } : {})}
        className="champion-detail-toolbar-primary__copy"
      />
      <div
        className="champion-detail-toolbar-tabs"
        role="tablist"
        aria-label={tabAriaLabel}
      >
        {sectionLinks.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            id={`detail-tab-${section.id}`}
            aria-controls={section.id}
            aria-selected={activeSectionId === section.id}
            aria-pressed={activeSectionId === section.id}
            className={
              activeSectionId === section.id
                ? 'champion-detail-toolbar-tabs__button champion-detail-toolbar-tabs__button--active'
                : 'champion-detail-toolbar-tabs__button'
            }
            onClick={() => scrollToSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  )
}
