import { LocalizedText } from '../../components/LocalizedText'
import type { VariantsPageModel, VariantCampaignGroup } from './types'
import { VariantAdventureSection } from './VariantAdventureSection'

type VariantCampaignSectionProps = {
  readonly model: Pick<VariantsPageModel, 'locale' | 't'>
  readonly group: VariantCampaignGroup
}

export function VariantCampaignSection({ model, group }: VariantCampaignSectionProps) {
  const { t } = model

  return (
    <section className="variant-campaign-group">
      <header className="variant-campaign-group__header">
        <div className="variant-campaign-group__copy">
          <span className="variant-campaign-group__eyebrow">
            {t("战役分组")}
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
            {t("当前可见 {p0} 个冒险分支，共 {p1} 个变体。", { p0: String(group.adventures.length), p1: String(group.variantCount) })}
          </p>
        </div>
        <div className="variant-campaign-group__badge">
          <strong>{group.variantCount}</strong>
          <span>{t("变体")}</span>
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
