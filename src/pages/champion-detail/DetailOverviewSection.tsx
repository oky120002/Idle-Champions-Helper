import type { MessageRef, TranslateParams } from '../../app/i18n'
import { SurfaceCard } from '../../components/SurfaceCard'
import { DetailField } from './detail-cards'
import type { DetailFieldProps } from './types'

type DetailOverviewSectionProps = {
  readonly t: (text: string | MessageRef, params?: TranslateParams) => string
  readonly overviewFields: DetailFieldProps[]
}

export function DetailOverviewSection({ t, overviewFields }: DetailOverviewSectionProps) {
  return (
    <SurfaceCard
      className="detail-section detail-section--overview"
      eyebrow={t("概览")}
      title={t("身份、系统字段与可用性")}
      description={t("先把最容易影响筛选、判断和排错的基础字段集中展示。")}
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
