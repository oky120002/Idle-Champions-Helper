import { SurfaceCard } from '../../components/SurfaceCard'
import type { ChampionDetail } from '../../domain/types'
import { FeatCard } from './detail-cards'
import { DetailSectionHeader } from './detail-primitives'
import type { DetailSectionBadge, EffectContext } from './types'

type DetailFeatSectionProps = {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
  featSectionBadges: DetailSectionBadge[]
  effectContext: EffectContext
}

export function DetailFeatSection({ detail, locale, t, featSectionBadges, effectContext }: DetailFeatSectionProps) {
  return (
    <SurfaceCard className="detail-section detail-section--feats detail-section--headerless">
      <div id="feats" className="detail-section-anchor" />
      <DetailSectionHeader title={t({ zh: '天赋', en: 'Feats' })} badges={featSectionBadges} />
      <div className="feat-grid">
        {detail.feats.map((feat) => (
          <FeatCard key={feat.id} feat={feat} locale={locale} effectContext={effectContext} />
        ))}
      </div>
    </SurfaceCard>
  )
}
