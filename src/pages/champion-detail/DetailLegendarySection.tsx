import { SurfaceCard } from '../../components/SurfaceCard'
import type { ChampionDetail } from '../../domain/types'
import { DetailSectionHeader } from './detail-primitives'
import { describeEffectItem } from './summary-model'
import type { EffectContext } from './types'

type DetailLegendarySectionProps = {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
  effectContext: EffectContext
}

export function DetailLegendarySection({ detail, locale, t, effectContext }: DetailLegendarySectionProps) {
  const legendaryEffects = detail.legendaryEffects ?? []

  return (
    <SurfaceCard className="detail-section detail-section--legendary detail-section--headerless">
      <div id="legendary" className="detail-section-anchor" />
      <DetailSectionHeader
        title="Legendary"
        badges={[
          {
            label: t({ zh: '效果', en: 'Effects' }),
            value: String(legendaryEffects.length),
          },
        ]}
      />

      {legendaryEffects.length > 0 ? (
        <div className="legendary-grid">
          {legendaryEffects.map((item) => {
            const effects = Array.isArray(item.effects)
              ? item.effects.map((effect) => describeEffectItem(effect, effectContext))
              : []

            return (
              <article key={`${item.slotId}-${item.id}`} className="detail-subcard legendary-card">
                <div className="legendary-card__topline">
                  <p className="detail-subcard__eyebrow">
                    {locale === 'zh-CN' ? `槽位 ${item.slotId}` : `Slot ${item.slotId}`}
                  </p>
                  <span className="detail-badge">#{item.id}</span>
                </div>
                {effects.length > 0 ? (
                  <div className="legendary-card__effects">
                    {effects.map((effect) => (
                      <p key={`${item.id}-${effect.summary}-${effect.detail ?? ''}`} className="detail-subcard__body">
                        {effect.summary}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="supporting-text">{t({ zh: '暂无效果说明。', en: 'No effect summary is available.' })}</p>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="status-banner status-banner--info">
          {t({ zh: '当前没有结构化传奇效果数据。', en: 'No structured legendary effect data is available.' })}
        </div>
      )}
    </SurfaceCard>
  )
}
