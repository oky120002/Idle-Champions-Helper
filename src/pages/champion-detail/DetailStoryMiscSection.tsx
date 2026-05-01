import { SurfaceCard } from '../../components/SurfaceCard'
import type { ChampionDetail } from '../../domain/types'
import { DetailField, LocalizedTextStack } from './detail-cards'
import { DetailCharacterSection } from './DetailCharacterSection'
import type { DetailFieldProps } from './types'

type DetailStoryMiscSectionProps = {
  detail: ChampionDetail
  locale: 'zh-CN' | 'en-US'
  t: (text: { zh: string; en: string }) => string
  overviewFields: DetailFieldProps[]
}

function dedupeFields(fields: DetailFieldProps[]): DetailFieldProps[] {
  const seen = new Set<string>()

  return fields.filter((field) => {
    if (seen.has(field.label)) {
      return false
    }

    seen.add(field.label)
    return true
  })
}

export function DetailStoryMiscSection({ detail, locale, t, overviewFields }: DetailStoryMiscSectionProps) {
  const affiliationField: DetailFieldProps = {
    label: t({ zh: '联动', en: 'Affiliations' }),
    value:
      detail.summary.affiliations.length > 0 ? (
        <>
          {detail.summary.affiliations.map((item) => (
            <LocalizedTextStack key={`${item.display}-${item.original}`} value={item} />
          ))}
        </>
      ) : (
        t({ zh: '暂无', en: 'None yet' })
      ),
    variant: 'compact',
  }
  const miscFields = dedupeFields([affiliationField, ...overviewFields])

  return (
    <div className="story-misc-stack">
      <div id="story-misc" className="detail-section-anchor" />
      <DetailCharacterSection detail={detail} locale={locale} t={t} />

      <SurfaceCard className="detail-section detail-section--overview detail-section--headerless">
        {miscFields.length > 0 ? (
          <div className="detail-field-grid detail-field-grid--compact">
            {miscFields.map((field) => (
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
      </SurfaceCard>
    </div>
  )
}
