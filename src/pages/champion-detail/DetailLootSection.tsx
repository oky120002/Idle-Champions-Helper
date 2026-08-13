import type { LocaleText, TranslateParams } from '../../app/i18n'
import { SurfaceCard } from '../../components/SurfaceCard'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import type { ChampionDetail } from '../../domain/types'
import { buildRarityLabel } from './detail-card-model'
import { describeEffectItem } from './summary-model'
import type { EffectContext } from './types'

type DetailLootSectionProps = {
  readonly detail: ChampionDetail
  readonly locale: 'zh-CN' | 'en-US'
  readonly t: (text: string | LocaleText, params?: TranslateParams) => string
  readonly effectContext: EffectContext
}

export function DetailLootSection({ detail, locale, t, effectContext }: DetailLootSectionProps) {
  const loot = detail.loot

  return (
    <SurfaceCard className="detail-section detail-section--loot detail-section--headerless">
      <div id="loot" className="detail-section-anchor" />

      {loot.length > 0 ? (
        <div className="loot-grid">
          {loot.map((item) => {
            const effects = Array.isArray(item.effects)
              ? item.effects.map((effect) => describeEffectItem(effect, effectContext))
              : []

            return (
              <article key={item.id} className="detail-subcard loot-card">
                <div className="loot-card__topline">
                  <div>
                    <p className="detail-subcard__eyebrow">
                      {locale === 'zh-CN'
                        ? `槽位 ${String(item.slotId ?? '-')}`
                        : `Slot ${String(item.slotId ?? '-')}`}
                    </p>
                    <h3 className="detail-subcard__title">{getPrimaryLocalizedText(item.name, locale)}</h3>
                  </div>
                  <div className="detail-badge-row">
                    <span className="detail-badge">{buildRarityLabel(item.rarity, locale)}</span>
                    {item.isGoldenEpic ? <span className="detail-badge detail-badge--active">{locale === 'zh-CN' ? '金装史诗' : 'Golden Epic'}</span> : null}
                  </div>
                </div>
                {item.description ? (
                  <p className="detail-subcard__body">{getPrimaryLocalizedText(item.description, locale)}</p>
                ) : null}
                {effects.length > 0 ? (
                  <div className="loot-card__effects">
                    {effects.map((effect) => (
                      <p key={`${item.id}-${effect.summary}-${effect.detail ?? ''}`} className="loot-card__effect">
                        {effect.summary}
                      </p>
                    ))}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="status-banner status-banner--info">
          {t("当前没有结构化装备数据。")}
        </div>
      )}
    </SurfaceCard>
  )
}
