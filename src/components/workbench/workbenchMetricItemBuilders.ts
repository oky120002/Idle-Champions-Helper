import type { LocaleText, TranslateParams } from '../../app/i18n'
import type { PageHeaderMetricItem } from '../PageHeaderMetrics'

interface WorkbenchMetricLabelTranslator {
  (text: string | LocaleText, params?: TranslateParams): string
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
    label: t("当前展示"),
    value: t('{p0} / {p1} {p2}', {
      p0: String(visibleCount),
      p1: String(filteredCount),
      p2: enUnitLabel,
    }),
  }
}
