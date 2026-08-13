import type { LocaleText, TranslateParams } from '../../app/i18n'
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
  readonly detail: ChampionDetail
  readonly locale: 'zh-CN' | 'en-US'
  readonly t: (text: string | LocaleText, params?: TranslateParams) => string
  readonly activeSectionId: DetailSectionId
  readonly overviewFields: DetailFieldProps[]
  readonly effectContext: EffectContext
  readonly specializationGraphicsById: Map<string, ChampionSpecializationGraphic>
  readonly specializationColumns: SpecializationUpgradeColumn[]
  readonly ledgerRows: LedgerUpgradeRow[]
  readonly ledgerFilterOptions: Array<UpgradeCategoryMeta & { count: number }>
  readonly activeLedgerFilterKeySet: Set<string>
  readonly visibleLedgerRows: LedgerUpgradeRow[]
  readonly hiddenLedgerSummary: string
  readonly hasCustomLedgerFilterState: boolean
  readonly isShowingAllLedgerTypes: boolean
  readonly toggleLedgerFilter: (key: string) => void
  readonly resetLedgerFilters: () => void
  readonly enableAllLedgerFilters: () => void
  readonly openArtworkDialog: (skinId?: string) => void
  readonly isArtworkDialogOpen: boolean
  readonly selectedSkin: ChampionSkinDetail | null
  readonly selectedSkinAnimation: ChampionAnimation | null
  readonly selectedSkinIllustration: ChampionIllustration | null
  readonly selectedSkinArtworkIds: SkinArtworkIds | null
  readonly selectedSkinPreviewUrl: string | null
  readonly closeArtworkDialog: () => void
  readonly setSelectedSkinId: (skinId: string | null) => void
}

export function ChampionDetailBody(props: ChampionDetailBodyProps) {
  return (
    <>
      <section
        className="champion-detail-tab-shell"
        aria-label={props.t("英雄详情内容")}
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
