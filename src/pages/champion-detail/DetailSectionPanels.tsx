import type { ChampionDetail, ChampionSpecializationGraphic } from '../../domain/types'
import { DetailCharacterSection } from './DetailCharacterSection'
import { DetailCombatSection } from './DetailCombatSection'
import { DetailFeatSection } from './DetailFeatSection'
import { DetailOverviewSection } from './DetailOverviewSection'
import { DetailUpgradeSection } from './DetailUpgradeSection'
import type {
  DetailFieldProps,
  DetailSectionBadge,
  EffectContext,
  LedgerUpgradeRow,
  UpgradeCategoryMeta,
  UpgradePresentation,
} from './types'

interface DetailSectionPanelsProps {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
  overviewFields: DetailFieldProps[]
  effectContext: EffectContext
  upgradeSectionBadges: DetailSectionBadge[]
  featSectionBadges: DetailSectionBadge[]
  spotlightUpgrades: ChampionDetail['upgrades']
  upgradePresentations: Map<string, UpgradePresentation>
  specializationGraphicsById: Map<string, ChampionSpecializationGraphic>
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
}

export function DetailSectionPanels(props: DetailSectionPanelsProps) {
  return (
    <div className="champion-detail-content">
      <DetailOverviewSection t={props.t} overviewFields={props.overviewFields} />
      <DetailCharacterSection detail={props.detail} locale={props.locale} t={props.t} />
      <DetailCombatSection detail={props.detail} locale={props.locale} t={props.t} />
      <DetailUpgradeSection
        locale={props.locale}
        t={props.t}
        effectContext={props.effectContext}
        upgradeSectionBadges={props.upgradeSectionBadges}
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
      <DetailFeatSection
        detail={props.detail}
        locale={props.locale}
        t={props.t}
        featSectionBadges={props.featSectionBadges}
        effectContext={props.effectContext}
      />
    </div>
  )
}
