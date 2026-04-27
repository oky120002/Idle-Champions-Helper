import type {
  ChampionAnimation,
  ChampionDetail,
  ChampionIllustration,
  ChampionSkinDetail,
  ChampionSpecializationGraphic,
} from '../../domain/types'
import { DetailSectionPanels } from './DetailSectionPanels'
import { DossierSection } from './DossierSection'
import { SkinArtworkDialog } from './SkinArtworkDialog'
import type {
  DetailFieldProps,
  DetailSectionBadge,
  DetailSectionLink,
  EffectContext,
  LedgerUpgradeRow,
  SkinArtworkIds,
  SpecializationUpgradeColumn,
  UpgradeCategoryMeta,
} from './types'

interface ChampionDetailBodyProps {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
  activeSectionId: DetailSectionLink['id']
  sectionLinks: DetailSectionLink[]
  scrollToSection: (id: string) => void
  summaryAvailabilityBadges: Array<{ key: string; label: string; active?: boolean }>
  overviewFields: DetailFieldProps[]
  upgradeSectionBadges: DetailSectionBadge[]
  featSectionBadges: DetailSectionBadge[]
  effectContext: EffectContext
  specializationGraphicsById: Map<string, ChampionSpecializationGraphic>
  specializationColumns: SpecializationUpgradeColumn[]
  ledgerRows: LedgerUpgradeRow[]
  ledgerFilterOptions: Array<UpgradeCategoryMeta & { count: number }>
  activeLedgerFilterKeySet: Set<string>
  visibleLedgerRows: LedgerUpgradeRow[]
  hiddenLedgerSummary: string
  hasCustomLedgerFilterState: boolean
  isShowingAllLedgerTypes: boolean
  toggleLedgerFilter: (key: string) => void
  resetLedgerFilters: () => void
  enableAllLedgerFilters: () => void
  openArtworkDialog: (skinId?: string) => void
  isArtworkDialogOpen: boolean
  selectedSkin: ChampionSkinDetail | null
  selectedSkinAnimation: ChampionAnimation | null
  selectedSkinIllustration: ChampionIllustration | null
  selectedSkinArtworkIds: SkinArtworkIds | null
  selectedSkinPreviewUrl: string | null
  closeArtworkDialog: () => void
  setSelectedSkinId: (skinId: string | null) => void
}

export function ChampionDetailBody(props: ChampionDetailBodyProps) {
  return (
    <>
      <div className="champion-detail-layout">
        <DossierSection
          detail={props.detail}
          locale={props.locale}
          t={props.t}
          summaryAvailabilityBadges={props.summaryAvailabilityBadges}
          overviewFields={props.overviewFields}
          openArtworkDialog={props.openArtworkDialog}
        />
        <section
          className="champion-detail-tab-shell"
          aria-label={props.t({ zh: '英雄详情内容', en: 'Champion detail content' })}
        >
          <div
            className="champion-detail-tab-bar"
            role="tablist"
            aria-label={props.t({ zh: '详情页签', en: 'Detail tabs' })}
          >
            {props.sectionLinks.map((section) => (
              <button
                key={section.id}
                type="button"
                role="tab"
                id={`detail-tab-${section.id}`}
                aria-controls={section.id}
                aria-selected={props.activeSectionId === section.id}
                aria-pressed={props.activeSectionId === section.id}
                className={
                  props.activeSectionId === section.id
                    ? 'champion-detail-tab-bar__button champion-detail-tab-bar__button--active'
                    : 'champion-detail-tab-bar__button'
                }
                onClick={() => props.scrollToSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>

          <DetailSectionPanels
            detail={props.detail}
            locale={props.locale}
            t={props.t}
            activeSectionId={props.activeSectionId}
            effectContext={props.effectContext}
            upgradeSectionBadges={props.upgradeSectionBadges}
            featSectionBadges={props.featSectionBadges}
            overviewFields={props.overviewFields}
            specializationColumns={props.specializationColumns}
            specializationGraphicsById={props.specializationGraphicsById}
            ledgerRows={props.ledgerRows}
            ledgerFilterOptions={props.ledgerFilterOptions}
            activeLedgerFilterKeySet={props.activeLedgerFilterKeySet}
            visibleLedgerRows={props.visibleLedgerRows}
            hiddenLedgerSummary={props.hiddenLedgerSummary}
            hasCustomLedgerFilterState={props.hasCustomLedgerFilterState}
            isShowingAllLedgerTypes={props.isShowingAllLedgerTypes}
            toggleLedgerFilter={props.toggleLedgerFilter}
            resetLedgerFilters={props.resetLedgerFilters}
            enableAllLedgerFilters={props.enableAllLedgerFilters}
            openArtworkDialog={props.openArtworkDialog}
          />
        </section>
      </div>

      <SkinArtworkDialog
        detail={props.detail}
        locale={props.locale}
        t={props.t}
        isArtworkDialogOpen={props.isArtworkDialogOpen}
        selectedSkin={props.selectedSkin}
        selectedSkinAnimation={props.selectedSkinAnimation}
        selectedSkinIllustration={props.selectedSkinIllustration}
        selectedSkinArtworkIds={props.selectedSkinArtworkIds}
        selectedSkinPreviewUrl={props.selectedSkinPreviewUrl}
        closeArtworkDialog={props.closeArtworkDialog}
        setSelectedSkinId={props.setSelectedSkinId}
      />
    </>
  )
}
