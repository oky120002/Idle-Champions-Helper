import { LocalizedText } from '../../components/LocalizedText'
import { getLocalizedTextPair } from '../../domain/localizedText'
import {
  formatVariantPercent,
  getAttackSummary,
  getAttackTypeStats,
  getEnemyTypeStats,
  getMechanicLabels,
  getSpecialEnemySummary,
} from './variant-detail-model'
import type { VariantsPageModel } from './types'
import { VariantAdventureTabs } from './VariantAdventureTabs'
import { VariantFormationMiniBoard } from './VariantFormationMiniBoard'

type VariantAdventureDetailProps = {
  model: VariantsPageModel
}

export function VariantAdventureDetail({ model }: VariantAdventureDetailProps) {
  const { locale, t, selectedAdventureGroup } = model

  if (!selectedAdventureGroup) {
    return (
      <div className="variant-detail-empty">
        <h3>{t({ zh: '没有可展示的关卡', en: 'No adventure selected' })}</h3>
        <p>{t({ zh: '先在左侧选择地图和关卡。', en: 'Choose a campaign and adventure on the left.' })}</p>
      </div>
    )
  }

  const enemyStats = getEnemyTypeStats(selectedAdventureGroup, locale).slice(0, 10)
  const attackStats = getAttackTypeStats(selectedAdventureGroup.attackMix, locale)
  const mechanicLabels = getMechanicLabels(selectedAdventureGroup, locale)
  const sceneLabel = selectedAdventureGroup.scene
    ? getLocalizedTextPair(selectedAdventureGroup.scene, locale)
    : t({ zh: '未标记场景', en: 'No scene label' })

  return (
    <section className="variant-detail">
      <header className="variant-detail__overview">
        <div className="variant-detail__copy">
          <span className="variant-detail__eyebrow">
            {getLocalizedTextPair(selectedAdventureGroup.campaign, locale)}
          </span>
          <LocalizedText
            text={selectedAdventureGroup.adventure}
            mode="stacked"
            as="div"
            className="variant-detail__title-stack"
            primaryAs="h3"
            primaryClassName="variant-detail__title"
            secondaryAs="span"
            secondaryClassName="variant-detail__secondary"
          />
          <div className="variant-detail__meta-row">
            <span className="variant-meta-pill">{sceneLabel}</span>
            <span className="variant-meta-pill">
              {locale === 'zh-CN'
                ? `${selectedAdventureGroup.variants.length} 个变体`
                : `${selectedAdventureGroup.variants.length} variants`}
            </span>
            <span className="variant-meta-pill variant-meta-pill--accent">
              {locale === 'zh-CN'
                ? `${selectedAdventureGroup.areaMilestones.length} 个区域节点`
                : `${selectedAdventureGroup.areaMilestones.length} area nodes`}
            </span>
          </div>
        </div>

        <VariantFormationMiniBoard
          formation={selectedAdventureGroup.formation}
          locale={locale}
          t={t}
        />
      </header>

      <div className="variant-detail__intel-grid">
        <section className="variant-detail__intel variant-detail__intel--wide">
          <span className="variant-detail__intel-label">{t({ zh: '敌人分类', en: 'Enemy types' })}</span>
          <div className="variant-stat-list">
            {enemyStats.map((stat) => (
              <span key={stat.id} className="variant-stat-pill">
                <span>{stat.label}</span>
                <strong>{formatVariantPercent(stat.percent, locale)}</strong>
              </span>
            ))}
          </div>
        </section>

        <section className="variant-detail__intel">
          <span className="variant-detail__intel-label">{t({ zh: '攻击类型', en: 'Attack types' })}</span>
          <div className="variant-stat-list">
            {attackStats.map((stat) => (
              <span key={stat.id} className="variant-stat-pill">
                <span>{stat.label}</span>
                <strong>{formatVariantPercent(stat.percent, locale)}</strong>
              </span>
            ))}
          </div>
          <p className="variant-detail__intel-copy">{getAttackSummary(selectedAdventureGroup, locale)}</p>
        </section>

        <section className="variant-detail__intel">
          <span className="variant-detail__intel-label">{t({ zh: '特殊敌人', en: 'Special enemies' })}</span>
          <strong className="variant-detail__metric">{getSpecialEnemySummary(selectedAdventureGroup, locale)}</strong>
          <div className="variant-chip-row">
            {mechanicLabels.slice(0, 4).map((label) => (
              <span key={label} className="variant-chip variant-chip--soft">{label}</span>
            ))}
          </div>
        </section>
      </div>

      <VariantAdventureTabs model={model} />
    </section>
  )
}
