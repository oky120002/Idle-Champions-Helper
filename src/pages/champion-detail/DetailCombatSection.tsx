import { SurfaceCard } from '../../components/SurfaceCard'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionDetail } from '../../domain/types'
import { AttackPanel, DetailField, LocalizedTextStack } from './detail-cards'
import { DetailSectionHeader } from './detail-primitives'
import { formatDigitString, formatNumber } from './detail-value-formatters'

type DetailCombatSectionProps = {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
}

export function DetailCombatSection({ detail, locale, t }: DetailCombatSectionProps) {
  return (
    <SurfaceCard className="detail-section detail-section--combat detail-section--headerless">
      <div id="abilities" className="detail-section-anchor" />
      <DetailSectionHeader
        eyebrow={t({ zh: '战斗', en: 'Combat' })}
        title={t({ zh: '基础数值、普攻、大招与活动升级', en: 'Base stats, attacks, ultimate, and event upgrades' })}
        description={t({
          zh: '把会直接影响英雄机制理解的字段收拢到统一标题结构下，和升级区块保持同一阅读节奏。',
          en: 'Group the fields that most directly explain the champion’s combat behavior under the same section header structure used by upgrades.',
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
    </SurfaceCard>
  )
}
