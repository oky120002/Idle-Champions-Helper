import { PageHeaderMetrics, type PageHeaderMetricItem } from '../../components/PageHeaderMetrics'
import type { PresetsPageModel } from './types'

type PresetsMetricsProps = {
  model: PresetsPageModel
}

export function PresetsMetrics({ model }: PresetsMetricsProps) {
  const { t, metrics } = model

  const items: PageHeaderMetricItem[] = [
    { label: t({ zh: '命名方案总数', en: 'Named presets' }), value: metrics.total },
    { label: t({ zh: '可恢复方案', en: 'Restorable presets' }), value: metrics.recoverable },
    { label: t({ zh: '需注意方案', en: 'Risky presets' }), value: metrics.risky },
  ]

  return <PageHeaderMetrics items={items} />
}
