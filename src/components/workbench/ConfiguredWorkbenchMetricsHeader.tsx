import type { PageHeaderMetricItem } from '../PageHeaderMetrics'
import { useI18n } from '../../app/i18n'
import { WorkbenchFilterMetricsHeader } from './WorkbenchFilterMetricsHeader'

interface ConfiguredWorkbenchMetricsHeaderProps {
  items: PageHeaderMetricItem[]
  activeFilters?: string[] | undefined
}

export function ConfiguredWorkbenchMetricsHeader({
  items,
  activeFilters,
}: ConfiguredWorkbenchMetricsHeaderProps) {
  const { t } = useI18n()

  return (
    <WorkbenchFilterMetricsHeader
      items={items}
      {...(activeFilters !== undefined
        ? {
            activeFilters,
            filterSummaryPrefix: t({ zh: '当前筛选：', en: 'Active filters: ' }),
          }
        : {})}
    />
  )
}
