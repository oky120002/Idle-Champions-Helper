import type {
  ChampionAnimation,
  ChampionDetail,
  ChampionIllustration,
  ChampionSkinDetail,
  ChampionSpecializationGraphic,
} from '../../domain/types'
import { DetailSectionPanels } from './DetailSectionPanels'
import { SkinArtworkDialog } from './SkinArtworkDialog'
import type {
  DetailSectionId,
  DetailFieldProps,
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
  activeSectionId: DetailSectionId
  overviewFields: DetailFieldProps[]
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
      <section
        className="champion-detail-tab-shell"
        aria-label={props.t({ zh: '英雄详情内容', en: 'Champion detail content' })}
      >
        <DetailSectionPanels
          detail={props.detail}
          locale={props.locale}
          t={props.t}
          activeSectionId={props.activeSectionId}
          effectContext={props.effectContext}
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
