import { SurfaceCard } from '../../components/SurfaceCard'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionDetail, ChampionSpecializationGraphic } from '../../domain/types'
import { buildUpgradePresentation } from './effect-model'
import { AttackPanel, DetailField, FeatCard, LocalizedTextStack, NumericUpgradeRow, UpgradeCard } from './detail-cards'
import { DetailSectionHeader } from './detail-primitives'
import { formatDigitString, formatNumber } from './shared'
import type { DetailFieldProps, DetailSectionBadge, EffectContext, LedgerUpgradeRow, UpgradeCategoryMeta, UpgradePresentation } from './types'

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

export function DetailSectionPanels({
  detail,
  locale,
  t,
  overviewFields,
  effectContext,
  upgradeSectionBadges,
  featSectionBadges,
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
}: DetailSectionPanelsProps) {
  return (
    <div className="champion-detail-content">
              <SurfaceCard
                className="detail-section detail-section--overview"
                eyebrow={t({ zh: '概览', en: 'Overview' })}
                title={t({ zh: '身份、系统字段与可用性', en: 'Identity, system fields, and availability' })}
                description={t({
                  zh: '先把最容易影响筛选、判断和排错的基础字段集中展示。',
                  en: 'Start with the fields that most often affect filtering, decisions, and data checks.',
                })}
              >
                <div id="overview" className="detail-section-anchor" />
                <div className="detail-field-grid">
                  {overviewFields.map((field) => (
                    <DetailField key={field.label} label={field.label} value={field.value} hint={field.hint} />
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard
                className="detail-section detail-section--character"
                eyebrow={t({ zh: '角色卡', en: 'Character sheet' })}
                title={t({ zh: '叙事资料与能力分布', en: 'Narrative profile and ability spread' })}
                description={t({
                  zh: '把角色设定、D&D 属性和背景故事分在同一段，方便同时看机制与人设。',
                  en: 'Keep the lore profile, D&D stats, and backstory together so mechanics and flavor stay connected.',
                })}
              >
                <div id="character-sheet" className="detail-section-anchor" />
                {detail.characterSheet ? (
                  <>
                    <div className="detail-field-grid">
                      <DetailField label={t({ zh: '全名', en: 'Full name' })} value={detail.characterSheet.fullName ? <LocalizedTextStack value={detail.characterSheet.fullName} /> : t({ zh: '暂无', en: 'Not available' })} />
                      <DetailField label={t({ zh: '职业', en: 'Class' })} value={detail.characterSheet.class ? <LocalizedTextStack value={detail.characterSheet.class} /> : t({ zh: '暂无', en: 'Not available' })} />
                      <DetailField label={t({ zh: '种族', en: 'Race' })} value={detail.characterSheet.race ? <LocalizedTextStack value={detail.characterSheet.race} /> : t({ zh: '暂无', en: 'Not available' })} />
                      <DetailField label={t({ zh: '阵营', en: 'Alignment' })} value={detail.characterSheet.alignment ? <LocalizedTextStack value={detail.characterSheet.alignment} /> : t({ zh: '暂无', en: 'Not available' })} />
                      <DetailField label={t({ zh: '年龄', en: 'Age' })} value={formatNumber(detail.characterSheet.age, locale)} />
                    </div>

                    <div className="ability-score-grid">
                      {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((key) => (
                        <article key={key} className="ability-score-card">
                          <span className="ability-score-card__label">{key.toUpperCase()}</span>
                          <strong className="ability-score-card__value">{formatNumber(detail.characterSheet?.abilityScores[key] ?? null, locale)}</strong>
                        </article>
                      ))}
                    </div>

                    {detail.characterSheet.backstory ? (
                      <article className="detail-subcard detail-subcard--story">
                        <h3 className="detail-subcard__title">{t({ zh: '背景故事', en: 'Backstory' })}</h3>
                        <p className="detail-subcard__body">{getPrimaryLocalizedText(detail.characterSheet.backstory, locale)}</p>
                      </article>
                    ) : null}
                  </>
                ) : (
                  <div className="status-banner status-banner--info">{t({ zh: '当前没有角色卡字段。', en: 'No character sheet fields are available here.' })}</div>
                )}
              </SurfaceCard>

              <SurfaceCard
                className="detail-section detail-section--combat"
                eyebrow={t({ zh: '战斗', en: 'Combat' })}
                title={t({ zh: '基础数值、普攻、大招与活动升级', en: 'Base stats, attacks, ultimate, and event upgrades' })}
                description={t({
                  zh: '这里把会直接影响理解英雄机制的字段集中起来。',
                  en: 'This section groups the fields that most directly explain how the champion behaves in combat.',
                })}
              >
                <div id="combat" className="detail-section-anchor" />
                <div className="detail-field-grid">
                  <DetailField label={t({ zh: '基础花费', en: 'Base cost' })} value={formatDigitString(detail.baseCost, locale)} />
                  <DetailField label={t({ zh: '基础伤害', en: 'Base damage' })} value={formatDigitString(detail.baseDamage, locale)} />
                  <DetailField label={t({ zh: '基础生命', en: 'Base health' })} value={formatDigitString(detail.baseHealth, locale)} />
                  <DetailField label={t({ zh: '事件升级', en: 'Event upgrades' })} value={formatNumber(detail.attacks.eventUpgrades.length, locale)} />
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
                            <h3 className="detail-subcard__title"><LocalizedTextStack value={upgrade.name} /></h3>
                          </div>
                        </div>
                        {upgrade.description ? <p className="detail-subcard__body">{getPrimaryLocalizedText(upgrade.description, locale)}</p> : null}
                      </article>
                    ))}
                  </div>
                ) : null}
              </SurfaceCard>

              <SurfaceCard
                className="detail-section detail-section--upgrades detail-section--headerless"
              >
                <div id="upgrades" className="detail-section-anchor" />
                <DetailSectionHeader title={t({ zh: '升级', en: 'Upgrades' })} badges={upgradeSectionBadges} />

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
                        <p className="upgrade-filter-bar__description">
                          {hiddenLedgerSummary}
                        </p>
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
                          <button
                            type="button"
                            className="action-button action-button--ghost action-button--compact"
                            onClick={resetLedgerFilters}
                            disabled={!hasCustomLedgerFilterState}
                          >
                            {t({ zh: '恢复默认', en: 'Reset default' })}
                          </button>
                          <button
                            type="button"
                            className="action-button action-button--secondary action-button--compact"
                            onClick={enableAllLedgerFilters}
                            disabled={isShowingAllLedgerTypes}
                          >
                            {t({ zh: '显示全部', en: 'Show all' })}
                          </button>
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
                          <NumericUpgradeRow
                            key={row.upgrade.id}
                            upgrade={row.upgrade}
                            presentation={row.presentation}
                            locale={locale}
                          />
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

      <SurfaceCard
        className="detail-section detail-section--feats detail-section--headerless"
      >
        <div id="feats" className="detail-section-anchor" />
        <DetailSectionHeader title={t({ zh: '天赋', en: 'Feats' })} badges={featSectionBadges} />
        <div className="feat-grid">
          {detail.feats.map((feat) => (
            <FeatCard key={feat.id} feat={feat} locale={locale} effectContext={effectContext} />
          ))}
        </div>
      </SurfaceCard>
    </div>
  )
}
