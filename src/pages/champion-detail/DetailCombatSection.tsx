import type { LocaleText, TranslateParams } from '../../app/i18n'
import { ActionButton } from '../../components/ActionButton'
import { SurfaceCard } from '../../components/SurfaceCard'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionDetail } from '../../domain/types'
import { AttackPanel, DetailField, LocalizedTextStack, NumericUpgradeRow } from './detail-cards'
import { formatDigitString, formatNumber } from './detail-value-formatters'
import type { LedgerUpgradeRow, UpgradeCategoryMeta } from './types'

type DetailCombatSectionProps = {
  readonly detail: ChampionDetail
  readonly locale: 'zh-CN' | 'en-US'
  readonly t: (text: string | LocaleText, params?: TranslateParams) => string
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

      <div className="detail-field-grid">
        <DetailField label={t("基础花费")} value={formatDigitString(detail.baseCost, locale)} />
        <DetailField label={t("基础伤害")} value={formatDigitString(detail.baseDamage, locale)} />
        <DetailField label={t("基础生命")} value={formatDigitString(detail.baseHealth, locale)} />
        <DetailField
          label={t("事件升级")}
          value={formatNumber(detail.attacks.eventUpgrades.length, locale)}
        />
      </div>

      <div className="detail-card-grid detail-card-grid--two-up">
        <AttackPanel title={t("普攻")} attack={detail.attacks.base} locale={locale} />
        <AttackPanel title={t("大招")} attack={detail.attacks.ultimate} locale={locale} />
      </div>

      {detail.attacks.eventUpgrades.length > 0 ? (
        <div className="detail-card-grid">
          {detail.attacks.eventUpgrades.map((upgrade) => (
            <article key={upgrade.upgradeId} className="detail-subcard">
              <div className="detail-subcard__header">
                <div>
                  <p className="detail-subcard__eyebrow">{t("活动升级")}</p>
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
              <p className="upgrade-filter-bar__eyebrow">{t("等级列表过滤")}</p>
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
                  {t("恢复默认")}
                </ActionButton>
                <ActionButton
                  tone="secondary"
                  compact
                  onClick={enableAllLedgerFilters}
                  disabled={isShowingAllLedgerTypes}
                >
                  {t("显示全部")}
                </ActionButton>
              </div>
            </div>
          </div>

          {visibleLedgerRows.length > 0 ? (
            <div className="upgrade-ledger">
              <div className="upgrade-ledger__head">
                <span>{t("等级")}</span>
                <span>{t("类型")}</span>
                <span>{t("作用对象")}</span>
                <span>{t("效果说明")}</span>
                <span>{t("前置")}</span>
              </div>
              {visibleLedgerRows.map((row) => (
                <NumericUpgradeRow key={row.upgrade.id} upgrade={row.upgrade} presentation={row.presentation} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="upgrade-ledger__empty">
              {t("当前筛选把所有里程碑都收起了，重新打开上面的类型即可恢复列表。")}
            </div>
          )}
        </>
      ) : null}
    </SurfaceCard>
  )
}
