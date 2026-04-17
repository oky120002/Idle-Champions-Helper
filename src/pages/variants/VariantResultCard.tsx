import { LocalizedText } from '../../components/LocalizedText'
import { getSecondaryLocalizedText } from '../../domain/localizedText'
import type { Variant } from '../../domain/types'
import type { VariantsPageModel } from './types'

type VariantResultCardProps = {
  model: VariantsPageModel
  variant: Variant
}

export function VariantResultCard({ model, variant }: VariantResultCardProps) {
  const { locale, t } = model
  const secondaryName = getSecondaryLocalizedText(variant.name, locale)
  const secondaryCampaign = getSecondaryLocalizedText(variant.campaign, locale)

  return (
    <article className="result-card">
      <div className="result-card__header">
        <LocalizedText text={variant.campaign} mode="primary" as="span" className="result-card__eyebrow" />
        <LocalizedText text={variant.name} mode="primary" as="h3" className="result-card__title" />
      </div>

      {secondaryName || secondaryCampaign ? (
        <p className="result-card__secondary">{[secondaryName, secondaryCampaign].filter(Boolean).join(' · ')}</p>
      ) : null}

      <div className="result-block">
        <strong className="result-block__title">{t({ zh: '限制条件', en: 'Restrictions' })}</strong>
        {variant.restrictions.length > 0 ? (
          <ul className="bullet-list">
            {variant.restrictions.slice(0, 4).map((restriction) => (
              <li key={`${variant.id}-${restriction.original}-${restriction.display}`}>
                <LocalizedText text={restriction} mode="primary" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="supporting-text">
            {t({ zh: '当前还没解析到明确限制文本。', en: 'No explicit restriction text is available yet.' })}
          </p>
        )}
      </div>

      <div className="result-block">
        <strong className="result-block__title">{t({ zh: '奖励', en: 'Rewards' })}</strong>
        {variant.rewards.length > 0 ? (
          <ul className="bullet-list">
            {variant.rewards.slice(0, 3).map((reward) => (
              <li key={`${variant.id}-${reward.original}-${reward.display}`}>
                <LocalizedText text={reward} mode="primary" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="supporting-text">
            {t({ zh: '当前官方返回里没有显式奖励文本。', en: 'The official payload does not expose reward copy here yet.' })}
          </p>
        )}
      </div>
    </article>
  )
}
