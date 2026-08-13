import { ConfiguredWorkbenchMetricsHeader } from '../../components/workbench/ConfiguredWorkbenchMetricsHeader'
import { createWorkbenchShowingMetricItem } from '../../components/workbench/workbenchMetricItemBuilders'
import type { PetsPageModel } from './types'

interface PetsWorkbenchContentHeaderProps {
  readonly model: PetsPageModel
}

export function PetsWorkbenchContentHeader({ model }: PetsWorkbenchContentHeaderProps) {
  const { t, results, summary } = model
  const metricItems = [
    createWorkbenchShowingMetricItem({
      t,
      visibleCount: results.visiblePets.length,
      filteredCount: results.filteredPets.length,
      enUnitLabel: 'pets',
    }),
    { label: t("宠物总数"), value: summary.total },
    { label: t("完整图像"), value: summary.completeArt },
    { label: t("宝石商店"), value: summary.gems },
    { label: t("付费来源"), value: summary.premium },
    { label: t("赞助商商店"), value: summary.patron },
    { label: t("暂未开放"), value: summary.unavailable },
  ]

  return <ConfiguredWorkbenchMetricsHeader items={metricItems} />
}
