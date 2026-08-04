import { SurfaceCard } from '../../components/SurfaceCard'
import { DetailField } from './detail-cards'
import type { DetailFieldProps } from './types'

type DetailOverviewSectionProps = {
  t: (text: { zh: string; en: string }) => string
  overviewFields: DetailFieldProps[]
}

export function DetailOverviewSection({ t, overviewFields }: DetailOverviewSectionProps) {
  return (
    <SurfaceCard
      className="detail-section detail-section--overview"
      eyebrow={t({ zh: '概览', en: 'Overview' })}
      title={t({ zh: '身份、系统字段与可用性', en: 'Identity, system fields, and availability' })}
      description={t({
        zh: '先把最容易影响筛选、判断和排错的基础字段集中展示。',
        en: 'Start with the fields that most often affect filtering, decisions, and data checks.',
      })}
    >
      <div id="overview" className="detail-section-anchor" />
      <div className="detail-field-grid">
        {overviewFields.map((field) => (
          <DetailField key={field.label} label={field.label} value={field.value} hint={field.hint} />
        ))}
      </div>
    </SurfaceCard>
  )
}
