import type { MessageRef, TranslateParams } from '../../app/i18n'
import type { ChampionDetail, ChampionSpecializationGraphic } from '../../domain/types'
import { DetailCombatSection } from './DetailCombatSection'
import { DetailFeatSection } from './DetailFeatSection'
import { DetailLegendarySection } from './DetailLegendarySection'
import { DetailLootSection } from './DetailLootSection'
import { DetailSkinSection } from './DetailSkinSection'
import { DetailStoryMiscSection } from './DetailStoryMiscSection'
import { DetailUpgradeSection } from './DetailUpgradeSection'
import type {
  DetailFieldProps,
  DetailSectionLink,
  EffectContext,
  LedgerUpgradeRow,
  SpecializationUpgradeColumn,
  UpgradeCategoryMeta,
} from './types'

interface DetailSectionPanelsProps {
  readonly detail: ChampionDetail
  readonly locale: 'zh-CN' | 'en-US'
  readonly t: (text: string | MessageRef, params?: TranslateParams) => string
  readonly activeSectionId: DetailSectionLink['id']
  readonly effectContext: EffectContext
  readonly overviewFields: DetailFieldProps[]
  readonly specializationColumns: SpecializationUpgradeColumn[]
  readonly specializationGraphicsById: Map<string, ChampionSpecializationGraphic>
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
}

export function DetailSectionPanels(props: DetailSectionPanelsProps) {
  if (props.activeSectionId === 'abilities') {
    return (
      <div className="champion-detail-content">
        <DetailCombatSection
          detail={props.detail}
          locale={props.locale}
          t={props.t}
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
    )
  }

  if (props.activeSectionId === 'loot') {
    return (
      <div className="champion-detail-content">
        <DetailLootSection
          detail={props.detail}
          locale={props.locale}
          t={props.t}
          effectContext={props.effectContext}
        />
      </div>
    )
  }

  if (props.activeSectionId === 'legendary') {
    return (
      <div className="champion-detail-content">
        <DetailLegendarySection
          detail={props.detail}
          locale={props.locale}
          t={props.t}
          effectContext={props.effectContext}
        />
      </div>
    )
  }

  if (props.activeSectionId === 'feats') {
    return (
      <div className="champion-detail-content">
        <DetailFeatSection
          detail={props.detail}
          locale={props.locale}
          effectContext={props.effectContext}
        />
      </div>
    )
  }

  if (props.activeSectionId === 'skins') {
    return (
      <div className="champion-detail-content">
        <DetailSkinSection
          detail={props.detail}
          locale={props.locale}
          t={props.t}
          effectContext={props.effectContext}
          openArtworkDialog={props.openArtworkDialog}
        />
      </div>
    )
  }

  if (props.activeSectionId === 'story-misc') {
    return (
      <div className="champion-detail-content">
        <DetailStoryMiscSection
          detail={props.detail}
          locale={props.locale}
          t={props.t}
          overviewFields={props.overviewFields}
        />
      </div>
    )
  }

  return (
    <div className="champion-detail-content">
      <DetailUpgradeSection
        locale={props.locale}
        specializationColumns={props.specializationColumns}
        specializationGraphicsById={props.specializationGraphicsById}
      />
    </div>
  )
}
