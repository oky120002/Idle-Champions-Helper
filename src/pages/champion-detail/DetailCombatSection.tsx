import { ActionButton } from '../../components/ActionButton'
import { SurfaceCard } from '../../components/SurfaceCard'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionDetail } from '../../domain/types'
import { AttackPanel, DetailField, LocalizedTextStack, NumericUpgradeRow } from './detail-cards'
import { DetailSectionHeader } from './detail-primitives'
import { formatDigitString, formatNumber } from './detail-value-formatters'
import type { LedgerUpgradeRow, UpgradeCategoryMeta } from './types'

type DetailCombatSectionProps = {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
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

export function DetailCombatSection({
  detail,
  locale,
  t,
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
}: DetailCombatSectionProps) {
  return (
    <SurfaceCard className="detail-section detail-section--combat detail-section--headerless">
      <div id="abilities" className="detail-section-anchor" />
      <DetailSectionHeader
        eyebrow={t({ zh: '战斗', en: 'Combat' })}
        title={t({ zh: '基础数值、普攻、大招与等级升级', en: 'Base stats, attacks, ultimate, and level upgrades' })}
        description={t({
          zh: '把会直接影响英雄机制理解的字段和等级升级列表收拢到同一个能力阅读区。',
          en: 'Group combat behavior fields and the level-up ledger into the same abilities reading area.',
        })}
        badges={[]}
      />

      <div className="detail-field-grid">
        <DetailField label={t({ zh: '基础花费', en: 'Base cost' })} value={formatDigitString(detail.baseCost, locale)} />
        <DetailField label={t({ zh: '基础伤害', en: 'Base damage' })} value={formatDigitString(detail.baseDamage, locale)} />
        <DetailField label={t({ zh: '基础生命', en: 'Base health' })} value={formatDigitString(detail.baseHealth, locale)} />
        <DetailField
          label={t({ zh: '事件升级', en: 'Event upgrades' })}
          value={formatNumber(detail.attacks.eventUpgrades.length, locale)}
        />
      </div>

      <div className="detail-card-grid detail-card-grid--two-up">
        <AttackPanel title={t({ zh: '普攻', en: 'Base attack' })} attack={detail.attacks.base} locale={locale} />
        <AttackPanel title={t({ zh: '大招', en: 'Ultimate' })} attack={detail.attacks.ultimate} locale={locale} />
      </div>

      {detail.attacks.eventUpgrades.length > 0 ? (
        <div className="detail-card-grid">
          {detail.attacks.eventUpgrades.map((upgrade) => (
            <article key={upgrade.upgradeId} className="detail-subcard">
              <div className="detail-subcard__header">
                <div>
                  <p className="detail-subcard__eyebrow">{t({ zh: '活动升级', en: 'Event upgrade' })}</p>
                  <h3 className="detail-subcard__title">
                    <LocalizedTextStack value={upgrade.name} />
                  </h3>
                </div>
              </div>
              {upgrade.description ? (
                <p className="detail-subcard__body">{getPrimaryLocalizedText(upgrade.description, locale)}</p>
              ) : null}
            </article>
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
