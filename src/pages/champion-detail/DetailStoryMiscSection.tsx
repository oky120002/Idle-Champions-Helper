import { SurfaceCard } from '../../components/SurfaceCard'
import type { ChampionDetail } from '../../domain/types'
import { DetailField } from './detail-cards'
import { DetailCharacterSection } from './DetailCharacterSection'
import { DetailSectionHeader } from './detail-primitives'
import type { DetailFieldProps } from './types'

type DetailStoryMiscSectionProps = {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
  overviewFields: DetailFieldProps[]
}

function formatRawSnapshot(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function DetailStoryMiscSection({ detail, locale, t, overviewFields }: DetailStoryMiscSectionProps) {
  const rawEntries = [
    { id: 'hero', label: 'Hero', value: detail.raw.hero },
    { id: 'attacks', label: 'Attacks', value: detail.raw.attacks },
    { id: 'upgrades', label: 'Upgrades', value: detail.raw.upgrades },
    { id: 'feats', label: 'Feats', value: detail.raw.feats },
    { id: 'skins', label: 'Skins', value: detail.raw.skins },
    { id: 'loot', label: 'Loot', value: detail.raw.loot },
    { id: 'legendary', label: 'Legendary', value: detail.raw.legendaryEffects },
  ]

  return (
    <div className="story-misc-stack">
      <div id="story-misc" className="detail-section-anchor" />
      <DetailCharacterSection detail={detail} locale={locale} t={t} />

      <SurfaceCard className="detail-section detail-section--overview detail-section--headerless">
        <DetailSectionHeader title={t({ zh: '故事与杂项', en: 'Story & Misc' })} badges={[]} />
        {overviewFields.length > 0 ? (
          <div className="detail-field-grid detail-field-grid--compact">
            {overviewFields.map((field) => (
              <DetailField
                key={field.label}
                label={field.label}
                value={field.value}
                hint={field.hint}
                variant="compact"
              />
            ))}
          </div>
        ) : null}
        <div className="raw-snapshot-list">
          {rawEntries.map((entry) => (
            <details key={entry.id} className="raw-snapshot">
              <summary>{entry.label}</summary>
              <pre>{formatRawSnapshot(entry.value)}</pre>
            </details>
          ))}
        </div>
      </SurfaceCard>
    </div>
  )
}
