import { LocalizedText } from '../../components/LocalizedText'
import type { VariantsPageModel, VariantCampaignGroup } from './types'
import { VariantAdventureSection } from './VariantAdventureSection'

type VariantCampaignSectionProps = {
  model: Pick<VariantsPageModel, 'locale' | 't'>
  group: VariantCampaignGroup
}

export function VariantCampaignSection({ model, group }: VariantCampaignSectionProps) {
  const { t } = model

  return (
    <section className="variant-campaign-group">
      <header className="variant-campaign-group__header">
        <div className="variant-campaign-group__copy">
          <span className="variant-campaign-group__eyebrow">
            {t({ zh: '战役分组', en: 'Campaign grouping' })}
          </span>
          <LocalizedText
            text={group.campaign}
            mode="stacked"
            as="div"
            className="variant-campaign-group__title-stack"
            primaryAs="h3"
            primaryClassName="variant-campaign-group__title"
            secondaryAs="span"
            secondaryClassName="variant-campaign-group__secondary"
          />
          <p className="variant-campaign-group__summary">
            {t({
              zh: `当前可见 ${group.adventures.length} 个冒险分支，共 ${group.variantCount} 个变体。`,
              en: `${group.adventures.length} visible adventures with ${group.variantCount} variants in this campaign.`,
            })}
          </p>
        </div>
        <div className="variant-campaign-group__badge">
          <strong>{group.variantCount}</strong>
          <span>{t({ zh: '变体', en: 'Variants' })}</span>
        </div>
      </header>

      <div className="variant-adventure-stack">
        {group.adventures.map((adventureGroup) => (
          <VariantAdventureSection key={adventureGroup.id} model={model} group={adventureGroup} />
        ))}
      </div>
    </section>
  )
}
