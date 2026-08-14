import type { MessageRef, TranslateParams } from '../../app/i18n'
import { SurfaceCard } from '../../components/SurfaceCard'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionDetail } from '../../domain/types'
import { SummaryTagGroup } from './detail-primitives'
import { buildRarityLabel } from './detail-card-model'
import { collectStructuredSummaryTags } from './summary-model'
import type { EffectContext } from './types'

type DetailSkinSectionProps = {
  readonly detail: ChampionDetail
  readonly locale: 'zh-CN' | 'en-US'
  readonly t: (text: string | MessageRef, params?: TranslateParams) => string
  readonly effectContext: EffectContext
  readonly openArtworkDialog: (skinId?: string) => void
}

export function DetailSkinSection({ detail, locale, t, effectContext, openArtworkDialog }: DetailSkinSectionProps) {
  return (
    <SurfaceCard className="detail-section detail-section--skins detail-section--headerless">
      <div id="skins" className="detail-section-anchor" />

      {detail.skins.length > 0 ? (
        <div className="skin-list-grid">
          {detail.skins.map((skin) => {
            const sourceItems = collectStructuredSummaryTags(skin.collectionsSource, locale, effectContext)
            const costItems = collectStructuredSummaryTags(skin.cost, locale, effectContext)
            const availabilityItems = collectStructuredSummaryTags(skin.availabilities, locale, effectContext)

            return (
              <article key={skin.id} className="detail-subcard skin-list-card">
                <div className="skin-list-card__topline">
                  <div>
                    <p className="detail-subcard__eyebrow">{buildRarityLabel(skin.rarity, locale)}</p>
                    <h3 className="detail-subcard__title">{getPrimaryLocalizedText(skin.name, locale)}</h3>
                  </div>
                  <button
                    type="button"
                    className="skin-list-card__preview-button"
                    onClick={() => openArtworkDialog(skin.id)}
                  >
                    {t("预览")}
                  </button>
                </div>
                {sourceItems.length > 0 ? (
                  <SummaryTagGroup label={t("来源")} items={sourceItems} />
                ) : null}
                {costItems.length > 0 ? (
                  <SummaryTagGroup label={t("成本")} items={costItems} />
                ) : null}
                {availabilityItems.length > 0 ? (
                  <SummaryTagGroup label={t("可得性")} items={availabilityItems} />
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="status-banner status-banner--info">
          {t("当前没有皮肤条目。")}
        </div>
      )}
    </SurfaceCard>
  )
}
