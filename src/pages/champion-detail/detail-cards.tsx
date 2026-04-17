import { resolveDataUrl } from '../../data/client'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import { buildFeatEffectEntries, buildFeatTagGroups, buildSummaryTagText } from './summary-model'
import { buildRarityLabel } from './detail-card-model'
import {
  DetailField,
  LocalizedTextStack,
  SummaryTagGroup,
  UpgradeSpecializationArt,
} from './detail-primitives'
import { buildNotAvailableLabel, formatNullableText, formatNumber } from './detail-value-formatters'
import type {
  AttackPanelProps,
  FeatCardProps,
  NumericUpgradeRowProps,
  UpgradeCardProps,
} from './types'

export { DetailField, LocalizedTextStack, SummaryTagGroup, UpgradeSpecializationArt } from './detail-primitives'

export function AttackPanel({ title, attack, locale }: AttackPanelProps) {
  if (!attack) {
    return (
      <article className="detail-subcard detail-subcard--empty">
        <h3 className="detail-subcard__title">{title}</h3>
        <p className="supporting-text">
          {locale === 'zh-CN' ? '当前没有可展示的攻击定义。' : 'No attack definition is available here.'}
        </p>
      </article>
    )
  }

  return (
    <article className="detail-subcard attack-card">
      <div className="attack-card__header">
        <div>
          <p className="detail-subcard__eyebrow">{title}</p>
          <h3 className="detail-subcard__title"><LocalizedTextStack value={attack.name} /></h3>
        </div>
        <div className="detail-badge-row">
          <span className="detail-badge">
            {locale === 'zh-CN'
              ? `冷却 ${formatNumber(attack.cooldown, locale)} 秒`
              : `${formatNumber(attack.cooldown, locale)}s cooldown`}
          </span>
          <span className="detail-badge">
            {locale === 'zh-CN'
              ? `目标 ${formatNumber(attack.numTargets, locale)}`
              : `${formatNumber(attack.numTargets, locale)} targets`}
          </span>
        </div>
      </div>

      {attack.description ? (
        <p className="detail-subcard__body">{getPrimaryLocalizedText(attack.description, locale)}</p>
      ) : null}
      {attack.longDescription ? (
        <p className="supporting-text">{getPrimaryLocalizedText(attack.longDescription, locale)}</p>
      ) : null}

      <div className="detail-field-grid detail-field-grid--compact">
        <DetailField
          label={locale === 'zh-CN' ? 'AOE 半径' : 'AOE radius'}
          value={formatNumber(attack.aoeRadius, locale)}
          variant="compact"
        />
        <DetailField
          label={locale === 'zh-CN' ? '伤害倍率' : 'Damage modifier'}
          value={formatNullableText(attack.damageModifier, locale)}
          variant="compact"
        />
        <DetailField
          label={locale === 'zh-CN' ? '目标规则' : 'Target rule'}
          value={formatNullableText(attack.target, locale)}
          variant="compact"
        />
      </div>

      {attack.damageTypes.length > 0 ? (
        <div className="tag-row">
          {attack.damageTypes.map((item) => (
            <span key={item} className="tag-pill">
              {item}
            </span>
          ))}
        </div>
      ) : null}

      {attack.tags.length > 0 ? (
        <div className="tag-row">
          {attack.tags.map((item) => (
            <span key={item} className="tag-pill tag-pill--muted">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}

export function UpgradeCard({ upgrade, presentation, locale, specializationGraphic }: UpgradeCardProps) {
  const isCompact = upgrade.upgradeType === 'unlock_ability' || upgrade.upgradeType === 'unlock_ultimate'
  const metaItems = [
    upgrade.requiredUpgradeId
      ? buildSummaryTagText(
          locale === 'zh-CN' ? '前置' : 'Prerequisite',
          presentation.prerequisiteLabel,
          locale,
        )
      : null,
    presentation.staticMultiplierLabel
      ? buildSummaryTagText(
          locale === 'zh-CN' ? '倍率' : 'Multiplier',
          presentation.staticMultiplierLabel,
          locale,
        )
      : null,
    !upgrade.defaultEnabled ? (locale === 'zh-CN' ? '默认关闭' : 'Disabled by default') : null,
  ].filter((value): value is string => Boolean(value))
  const noteItems = [presentation.targetHint, ...presentation.detailLines].filter(
    (value, index, list): value is string =>
      Boolean(value) && value !== presentation.summary && list.indexOf(value) === index,
  )

  return (
    <article className={isCompact ? 'detail-subcard upgrade-card upgrade-card--compact' : 'detail-subcard upgrade-card'}>
      <div className="upgrade-card__topline">
        <div className="upgrade-card__eyebrow-row">
          <span className="upgrade-card__level-pill">
            {locale === 'zh-CN'
              ? `等级 ${formatNumber(upgrade.requiredLevel, locale)}`
              : `Level ${formatNumber(upgrade.requiredLevel, locale)}`}
          </span>
          <span className="upgrade-card__type-badge">{presentation.typeLabel}</span>
        </div>
        {specializationGraphic ? (
          <UpgradeSpecializationArt
            src={resolveDataUrl(specializationGraphic.image.path)}
            alt={locale === 'zh-CN' ? `${presentation.title}专精图` : `${presentation.title} specialization art`}
          />
        ) : null}
      </div>

      <div className="upgrade-card__header">
        <div className="upgrade-card__title-stack">
          <h3 className="detail-subcard__title">{presentation.title}</h3>
        </div>
      </div>
      {presentation.summary ? <p className="upgrade-card__summary">{presentation.summary}</p> : null}

      {metaItems.length > 0 ? (
        <div className="upgrade-card__tag-row">
          {metaItems.map((item) => (
            <span key={item} className="upgrade-card__meta-pill">
              <strong className="upgrade-card__meta-value">{item}</strong>
            </span>
          ))}
        </div>
      ) : null}

      {noteItems.length > 0 ? (
        <div className={isCompact ? 'upgrade-card__details-body upgrade-card__details-body--compact' : 'upgrade-card__details-body'}>
          {noteItems.map((line) => (
            <p key={line} className="upgrade-card__note">
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </article>
  )
}

export function NumericUpgradeRow({ upgrade, presentation, locale }: NumericUpgradeRowProps) {
  return (
    <div className="upgrade-ledger__row">
      <span>
        {locale === 'zh-CN'
          ? `等级 ${formatNumber(upgrade.requiredLevel, locale)}`
          : `Level ${formatNumber(upgrade.requiredLevel, locale)}`}
      </span>
      <span>{presentation.typeLabel}</span>
      <span title={presentation.targetHint ?? undefined}>
        {presentation.targetLabel ?? (locale === 'zh-CN' ? '当前英雄' : 'Current champion')}
      </span>
      <span>{presentation.summary ?? presentation.staticMultiplierLabel ?? buildNotAvailableLabel(locale)}</span>
      <span>{presentation.prerequisiteLabel}</span>
    </div>
  )
}

export function FeatCard({ feat, locale, effectContext }: FeatCardProps) {
  const effectEntries = buildFeatEffectEntries(feat.effects, effectContext)
  const tagGroups = buildFeatTagGroups(feat, locale, effectContext)

  return (
    <article className="detail-subcard feat-card">
      <div className="feat-card__topline">
        <span className="upgrade-card__level-pill">
          {locale === 'zh-CN' ? `顺序 ${formatNumber(feat.order, locale)}` : `Order ${formatNumber(feat.order, locale)}`}
        </span>
        <span className="detail-badge feat-card__rarity">{buildRarityLabel(feat.rarity, locale)}</span>
      </div>

      <div className="feat-card__header">
        <div className="feat-card__heading">
          <h3 className="detail-subcard__title">{getPrimaryLocalizedText(feat.name, locale)}</h3>
        </div>
      </div>

      {feat.description ? (
        <p className="detail-subcard__body feat-card__summary">
          {getPrimaryLocalizedText(feat.description, locale)}
        </p>
      ) : null}

      {effectEntries.length > 0 ? (
        <div className="feat-card__effect-list">
          {effectEntries.map((entry) => (
            <article key={`${entry.summary}-${entry.detail ?? ''}`} className="feat-card__effect-item">
              <p className="feat-card__effect-summary">{entry.summary}</p>
              {entry.detail ? <p className="feat-card__effect-detail">{entry.detail}</p> : null}
            </article>
          ))}
        </div>
      ) : null}

      {tagGroups.length > 0 ? (
        <div className="feat-card__meta-groups">
          {tagGroups.map((group) => (
            <SummaryTagGroup key={group.label} label={group.label} items={group.items} />
          ))}
        </div>
      ) : null}
    </article>
  )
}
