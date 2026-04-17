import type { DetailSectionLink, DetailSectionProgressState } from './types'

interface DetailSidebarProps {
  t: (text: { zh: string; en: string }) => string
  activeSectionId: DetailSectionLink['id']
  sectionLinks: DetailSectionLink[]
  activeSectionLabel: string
  activeSectionIndex: number
  sectionProgressValue: string
  getSectionProgressState: (index: number) => DetailSectionProgressState
  getSectionProgressText: (state: DetailSectionProgressState) => string
  scrollToSection: (id: string) => void
}

export function DetailSidebar({
  t,
  activeSectionId,
  sectionLinks,
  activeSectionLabel,
  activeSectionIndex,
  sectionProgressValue,
  getSectionProgressState,
  getSectionProgressText,
  scrollToSection,
}: DetailSidebarProps) {
  return (
            <aside className="champion-detail-sidebar">
              <div className="champion-detail-sidebar__panel">
                <p className="champion-detail-sidebar__eyebrow">{t({ zh: '快速索引', en: 'Quick index' })}</p>
                <section className="champion-detail-sidebar__progress" aria-label={t({ zh: '卷宗进度', en: 'Dossier progress' })}>
                  <div className="champion-detail-sidebar__progress-head">
                    <div>
                      <p className="champion-detail-sidebar__progress-label">{t({ zh: '卷宗进度', en: 'Dossier progress' })}</p>
                      <p className="champion-detail-sidebar__progress-copy">
                        {t({ zh: '当前浏览', en: 'Currently reading' })} · {activeSectionLabel}
                      </p>
                    </div>
                    <strong className="champion-detail-sidebar__progress-value">
                      {activeSectionIndex + 1} / {sectionLinks.length}
                    </strong>
                  </div>
                  <div className="champion-detail-sidebar__progress-track" aria-hidden="true">
                    <span className="champion-detail-sidebar__progress-fill" style={{ width: sectionProgressValue }} />
                  </div>
                </section>

                <div className="champion-detail-sidebar__nav">
                  {sectionLinks.map((section, index) => {
                    const progressState = getSectionProgressState(index)

                    return (
                      <button
                        key={section.id}
                        type="button"
                        data-testid={`sidebar-section-${section.id}`}
                        data-progress-state={progressState}
                        className={
                          activeSectionId === section.id
                            ? 'champion-detail-sidebar__button champion-detail-sidebar__button--active'
                            : 'champion-detail-sidebar__button'
                        }
                        aria-label={section.label}
                        aria-pressed={activeSectionId === section.id}
                        aria-current={progressState === 'active' ? 'step' : undefined}
                        onClick={() => scrollToSection(section.id)}
                      >
                        <span className="champion-detail-sidebar__button-index">{String(index + 1).padStart(2, '0')}</span>
                        <span className="champion-detail-sidebar__button-copy">
                          <span className="champion-detail-sidebar__button-label">{section.label}</span>
                          <span className="champion-detail-sidebar__button-state">{getSectionProgressText(progressState)}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>

              </div>
            </aside>
  )
}
