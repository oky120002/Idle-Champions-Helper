import type { DetailSectionLink } from './types'

interface ChampionDetailToolbarPrimaryProps {
  activeSectionId: DetailSectionLink['id']
  sectionLinks: DetailSectionLink[]
  tabAriaLabel: string
  scrollToSection: (id: string) => void
}

export function ChampionDetailToolbarPrimary({
  activeSectionId,
  sectionLinks,
  tabAriaLabel,
  scrollToSection,
}: ChampionDetailToolbarPrimaryProps) {
  return (
    <div className="champion-detail-toolbar-primary">
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
