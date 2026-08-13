import { LocalizedText } from '../../components/LocalizedText'
import type { Variant } from '../../domain/types'
import { getAreaHighlightLabel, getMechanicLabel } from './variant-labels'
import type { VariantsPageModel } from './types'

type VariantResultCardProps = {
  readonly model: Pick<VariantsPageModel, 'locale' | 't'>
  readonly variant: Variant
}

export function VariantResultCard({ model, variant }: VariantResultCardProps) {
  const { locale, t } = model
  const rewardItems = variant.rewards.slice(0, 2)
  const mechanicItems = variant.mechanics.slice(0, 4)
  const areaHighlightItems = variant.areaHighlights.slice(0, 3)

  return (
    <article className="variant-entry">
      <div className="variant-entry__header">
        <div className="variant-entry__copy">
          <span className="variant-entry__eyebrow">
            {locale === 'zh-CN' ? `变体 #${variant.id}` : `Variant #${variant.id}`}
          </span>
          <LocalizedText
            text={variant.name}
            mode="stacked"
            as="div"
            className="variant-entry__title-stack"
            primaryAs="h5"
            primaryClassName="variant-entry__title"
            secondaryAs="span"
            secondaryClassName="variant-entry__secondary"
          />
        </div>

        <div className="variant-entry__facts">
          {variant.objectiveArea !== null ? (
            <span className="variant-meta-pill variant-meta-pill--small">
              {locale === 'zh-CN' ? `${String(variant.objectiveArea)} 区完成` : `Finish at ${String(variant.objectiveArea)}`}
            </span>
          ) : null}
          {variant.escortCount > 0 ? (
            <span className="variant-meta-pill variant-meta-pill--small variant-meta-pill--accent">
              {locale === 'zh-CN' ? `${String(variant.escortCount)} 个护送占位` : `${String(variant.escortCount)} escorts`}
            </span>
          ) : null}
        </div>
      </div>

      <div className="variant-entry__grid">
        <section className="variant-entry__block">
          <span className="variant-entry__label">{t("限制条件")}</span>
          {variant.restrictions.length > 0 ? (
            <ul className="bullet-list variant-entry__list">
              {variant.restrictions.slice(0, 3).map((restriction) => (
                <li key={`${variant.id}-${restriction.original}-${restriction.display}`}>
                  <LocalizedText text={restriction} mode="primary" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="supporting-text">
              {t("官方没有返回额外限制文本。")}
            </p>
          )}
        </section>

        <section className="variant-entry__block">
          <span className="variant-entry__label">{t("场景变化")}</span>
          {mechanicItems.length > 0 || areaHighlightItems.length > 0 ? (
            <div className="variant-chip-row">
              {mechanicItems.map((mechanic) => (
                <span key={`${variant.id}-${mechanic}`} className="variant-chip variant-chip--soft">
                  {getMechanicLabel(mechanic, locale)}
                </span>
              ))}
              {areaHighlightItems.map((highlight) => (
                <span key={highlight.id} className="variant-chip variant-chip--soft">
                  {getAreaHighlightLabel(highlight, locale)}
                </span>
              ))}
            </div>
          ) : (
            <p className="supporting-text">
              {t("没有解析到额外的区域事件。")}
            </p>
          )}
        </section>
      </div>

      {rewardItems.length > 0 ? (
        <div className="variant-entry__reward-row">
          <span className="variant-entry__label">{t("奖励")}</span>
          <div className="variant-chip-row">
            {rewardItems.map((reward) => (
              <span key={`${variant.id}-${reward.original}-${reward.display}`} className="variant-chip">
                <LocalizedText text={reward} mode="primary" />
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  )
}
