import { SurfaceCard } from '../../components/SurfaceCard'
import type { ChampionDetail } from '../../domain/types'
import { FeatCard } from './detail-cards'
import type { EffectContext } from './types'

type DetailFeatSectionProps = {
  readonly detail: ChampionDetail
  readonly locale: 'zh-CN' | 'en-US'
  readonly effectContext: EffectContext
}

export function DetailFeatSection({ detail, locale, effectContext }: DetailFeatSectionProps) {
  return (
    <SurfaceCard className="detail-section detail-section--feats detail-section--headerless">
      <div id="feats" className="detail-section-anchor" />
      <div className="feat-grid">
        {detail.feats.map((feat) => (
          <FeatCard key={feat.id} feat={feat} locale={locale} effectContext={effectContext} />
        ))}
      </div>
    </SurfaceCard>
  )
}
