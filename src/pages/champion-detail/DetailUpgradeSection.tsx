import { ActionButton } from '../../components/ActionButton'
import { SurfaceCard } from '../../components/SurfaceCard'
import type { ChampionDetail, ChampionSpecializationGraphic } from '../../domain/types'
import { buildUpgradePresentation } from './effect-model'
import { NumericUpgradeRow, UpgradeCard } from './detail-cards'
import { DetailSectionHeader } from './detail-primitives'
import { formatNumber } from './detail-value-formatters'
import type { DetailSectionBadge, EffectContext, LedgerUpgradeRow, UpgradeCategoryMeta, UpgradePresentation } from './types'

type DetailUpgradeSectionProps = {
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
  effectContext: EffectContext
  upgradeSectionBadges: DetailSectionBadge[]
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

export function DetailUpgradeSection({
  locale,
  t,
  effectContext,
  upgradeSectionBadges,
  spotlightUpgrades,
  upgradePresentations,
  specializationGraphicsById,
  ledgerRows,
  ledgerFilterOptions,
  activeLedgerFilterKeySet,
  visibleLedgerRows,
  hiddenLedgerSummary,
  hasCustomLedgerFilterState,
  isShowingAllLedgerTypes,
  toggleLedgerFilter,
  resetLedgerFilters,
  enableAllLedgerFilters,
}: DetailUpgradeSectionProps) {
  return (
    <SurfaceCard className="detail-section detail-section--upgrades detail-section--headerless">
      <div id="specializations" className="detail-section-anchor" />
      <DetailSectionHeader title="Specializations" badges={upgradeSectionBadges} />

      {spotlightUpgrades.length > 0 ? (
        <div className="upgrade-showcase-grid">
          {spotlightUpgrades.map((upgrade) => (
            <UpgradeCard
              key={upgrade.id}
              upgrade={upgrade}
              presentation={upgradePresentations.get(upgrade.id) ?? buildUpgradePresentation(upgrade, effectContext)}
              locale={locale}
              specializationGraphic={
                upgrade.specializationGraphicId
                  ? specializationGraphicsById.get(upgrade.specializationGraphicId) ?? null
                  : null
              }
            />
          ))}
        </div>
      ) : null}

      {ledgerRows.length > 0 ? (
        <>
          <div className="upgrade-filter-bar">
            <div className="upgrade-filter-bar__copy">
              <p className="upgrade-filter-bar__eyebrow">{t({ zh: '等级列表过滤', en: 'Ledger filters' })}</p>
              <p className="upgrade-filter-bar__description">{hiddenLedgerSummary}</p>
            </div>
            <div className="upgrade-filter-bar__controls">
              <div className="upgrade-filter-chip-row">
                {ledgerFilterOptions.map((option) => {
                  const isActive = activeLedgerFilterKeySet.has(option.key)

                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={isActive ? 'upgrade-filter-chip upgrade-filter-chip--active' : 'upgrade-filter-chip'}
                      aria-pressed={isActive}
                      onClick={() => toggleLedgerFilter(option.key)}
                    >
                      <span className="upgrade-filter-chip__label">{option.label}</span>
                      <span className="upgrade-filter-chip__count">{formatNumber(option.count, locale)}</span>
                    </button>
                  )
                })}
              </div>
              <div className="upgrade-filter-bar__actions">
                <ActionButton
                  tone="ghost"
                  compact
                  onClick={resetLedgerFilters}
                  disabled={!hasCustomLedgerFilterState}
                >
                  {t({ zh: '恢复默认', en: 'Reset default' })}
                </ActionButton>
                <ActionButton
                  tone="secondary"
                  compact
                  onClick={enableAllLedgerFilters}
                  disabled={isShowingAllLedgerTypes}
                >
                  {t({ zh: '显示全部', en: 'Show all' })}
                </ActionButton>
              </div>
            </div>
          </div>

          {visibleLedgerRows.length > 0 ? (
            <div className="upgrade-ledger">
              <div className="upgrade-ledger__head">
                <span>{t({ zh: '等级', en: 'Level' })}</span>
                <span>{t({ zh: '类型', en: 'Type' })}</span>
                <span>{t({ zh: '作用对象', en: 'Target' })}</span>
                <span>{t({ zh: '效果说明', en: 'Effect summary' })}</span>
                <span>{t({ zh: '前置', en: 'Prerequisite' })}</span>
              </div>
              {visibleLedgerRows.map((row) => (
                <NumericUpgradeRow key={row.upgrade.id} upgrade={row.upgrade} presentation={row.presentation} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="upgrade-ledger__empty">
              {t({
                zh: '当前筛选把所有里程碑都收起了，重新打开上面的类型即可恢复列表。',
                en: 'The current filter hides every milestone. Re-enable any type above to bring the ledger back.',
              })}
            </div>
          )}
        </>
      ) : null}
    </SurfaceCard>
  )
}
