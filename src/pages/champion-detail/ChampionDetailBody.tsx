import type {
  ChampionDetail,
  ChampionIllustration,
  ChampionSkinDetail,
  ChampionSpecializationGraphic,
} from '../../domain/types'
import { DetailSectionPanels } from './DetailSectionPanels'
import { DetailSidebar } from './DetailSidebar'
import { DossierSection } from './DossierSection'
import { SkinArtworkDialog } from './SkinArtworkDialog'
import type {
  DetailFieldProps,
  DetailSectionBadge,
  DetailSectionLink,
  DetailSectionProgressState,
  EffectContext,
  LedgerUpgradeRow,
  SkinArtworkIds,
  UpgradeCategoryMeta,
  UpgradePresentation,
} from './types'

interface ChampionDetailBodyProps {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
  activeSectionId: DetailSectionLink['id']
  sectionLinks: DetailSectionLink[]
  activeSectionLabel: string
  activeSectionIndex: number
  sectionProgressValue: string
  getSectionProgressState: (index: number) => DetailSectionProgressState
  getSectionProgressText: (state: DetailSectionProgressState) => string
  scrollToSection: (id: string) => void
  summaryAvailabilityBadges: Array<{ key: string; label: string; active?: boolean }>
  overviewFields: DetailFieldProps[]
  upgradeSectionBadges: DetailSectionBadge[]
  featSectionBadges: DetailSectionBadge[]
  effectContext: EffectContext
  upgradePresentations: Map<string, UpgradePresentation>
  specializationGraphicsById: Map<string, ChampionSpecializationGraphic>
  spotlightUpgrades: ChampionDetail['upgrades']
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
  selectedSkinIllustration: ChampionIllustration | null
  selectedSkinArtworkIds: SkinArtworkIds | null
  selectedSkinPreviewUrl: string | null
  closeArtworkDialog: () => void
  setSelectedSkinId: (skinId: string | null) => void
}

export function ChampionDetailBody(props: ChampionDetailBodyProps) {
  return (
    <>
      <DossierSection
        detail={props.detail}
        locale={props.locale}
        t={props.t}
        summaryAvailabilityBadges={props.summaryAvailabilityBadges}
        sectionLinks={props.sectionLinks}
        activeSectionId={props.activeSectionId}
        scrollToSection={props.scrollToSection}
        openArtworkDialog={props.openArtworkDialog}
      />

      <div className="champion-detail-layout">
        <DetailSectionPanels
          detail={props.detail}
          locale={props.locale}
          t={props.t}
          overviewFields={props.overviewFields}
          effectContext={props.effectContext}
          upgradeSectionBadges={props.upgradeSectionBadges}
          featSectionBadges={props.featSectionBadges}
          spotlightUpgrades={props.spotlightUpgrades}
          upgradePresentations={props.upgradePresentations}
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
        />

        <DetailSidebar
          t={props.t}
          activeSectionId={props.activeSectionId}
          sectionLinks={props.sectionLinks}
          activeSectionLabel={props.activeSectionLabel}
          activeSectionIndex={props.activeSectionIndex}
          sectionProgressValue={props.sectionProgressValue}
          getSectionProgressState={props.getSectionProgressState}
          getSectionProgressText={props.getSectionProgressText}
          scrollToSection={props.scrollToSection}
        />
      </div>

      <SkinArtworkDialog
        detail={props.detail}
        locale={props.locale}
        t={props.t}
        isArtworkDialogOpen={props.isArtworkDialogOpen}
        selectedSkin={props.selectedSkin}
        selectedSkinIllustration={props.selectedSkinIllustration}
        selectedSkinArtworkIds={props.selectedSkinArtworkIds}
        selectedSkinPreviewUrl={props.selectedSkinPreviewUrl}
        closeArtworkDialog={props.closeArtworkDialog}
        setSelectedSkinId={props.setSelectedSkinId}
      />
    </>
  )
}
