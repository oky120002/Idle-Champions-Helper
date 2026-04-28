import { SurfaceCard } from '../../components/SurfaceCard'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionDetail } from '../../domain/types'
import { DetailSectionHeader, SummaryTagGroup } from './detail-primitives'
import { buildRarityLabel } from './detail-card-model'
import { collectStructuredSummaryTags } from './summary-model'
import type { EffectContext } from './types'

type DetailSkinSectionProps = {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
  effectContext: EffectContext
  openArtworkDialog: (skinId?: string) => void
}

export function DetailSkinSection({ detail, locale, t, effectContext, openArtworkDialog }: DetailSkinSectionProps) {
  return (
    <SurfaceCard className="detail-section detail-section--skins detail-section--headerless">
      <div id="skins" className="detail-section-anchor" />
      <DetailSectionHeader title={t({ zh: '皮肤', en: 'Skins' })} badges={[]} />

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
                    {t({ zh: '预览', en: 'Preview' })}
                  </button>
                </div>
                {sourceItems.length > 0 ? (
                  <SummaryTagGroup label={t({ zh: '来源', en: 'Source' })} items={sourceItems} />
                ) : null}
                {costItems.length > 0 ? (
                  <SummaryTagGroup label={t({ zh: '成本', en: 'Cost' })} items={costItems} />
                ) : null}
                {availabilityItems.length > 0 ? (
                  <SummaryTagGroup label={t({ zh: '可得性', en: 'Availability' })} items={availabilityItems} />
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="status-banner status-banner--info">
          {t({ zh: '当前没有皮肤条目。', en: 'No skin entries are available.' })}
        </div>
      )}
    </SurfaceCard>
  )
}
