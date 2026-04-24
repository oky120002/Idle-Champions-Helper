import type { PageHeaderMetricItem } from '../../components/PageHeaderMetrics'
import { WorkbenchFilterMetricsHeader } from '../../components/workbench/WorkbenchFilterMetricsHeader'
import type { PetsPageModel } from './types'

interface PetsWorkbenchContentHeaderProps {
  model: PetsPageModel
}

export function PetsWorkbenchContentHeader({ model }: PetsWorkbenchContentHeaderProps) {
  const { t, results, summary } = model
  const metricItems: PageHeaderMetricItem[] = [
    {
      label: t({ zh: '当前展示', en: 'Showing' }),
      value: t({
        zh: `${results.visiblePets.length} / ${results.filteredPets.length}`,
        en: `${results.visiblePets.length} / ${results.filteredPets.length} pets`,
      }),
    },
    { label: t({ zh: '宠物总数', en: 'Pets' }), value: summary.total },
    { label: t({ zh: '完整图像', en: 'Full art' }), value: summary.completeArt },
    { label: t({ zh: '宝石商店', en: 'Gem shop' }), value: summary.gems },
    { label: t({ zh: '付费来源', en: 'Premium' }), value: summary.premium },
    { label: t({ zh: '赞助商商店', en: 'Patron shop' }), value: summary.patron },
    { label: t({ zh: '暂未开放', en: 'Unavailable' }), value: summary.unavailable },
  ]

  return <WorkbenchFilterMetricsHeader items={metricItems} />
}
