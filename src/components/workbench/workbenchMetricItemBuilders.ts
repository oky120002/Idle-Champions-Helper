import type { PageHeaderMetricItem } from '../PageHeaderMetrics'

interface WorkbenchMetricLabelTranslator {
  (copy: { zh: string; en: string }): string
}

interface CreateWorkbenchShowingMetricItemOptions {
  t: WorkbenchMetricLabelTranslator
  visibleCount: number
  filteredCount: number
  enUnitLabel: string
}

export function createWorkbenchShowingMetricItem({
  t,
  visibleCount,
  filteredCount,
  enUnitLabel,
}: CreateWorkbenchShowingMetricItemOptions): PageHeaderMetricItem {
  return {
    label: t({ zh: '当前展示', en: 'Showing' }),
    value: t({
      zh: `${visibleCount} / ${filteredCount}`,
      en: `${visibleCount} / ${filteredCount} ${enUnitLabel}`,
    }),
  }
}
