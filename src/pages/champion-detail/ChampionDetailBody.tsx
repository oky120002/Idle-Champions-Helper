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
  UpgradeCategoryMeta,
  UpgradePresentation,
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
      <DossierSection
        detail={props.detail}
        locale={props.locale}
        t={props.t}
        summaryAvailabilityBadges={props.summaryAvailabilityBadges}
        overviewFields={props.overviewFields}
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
