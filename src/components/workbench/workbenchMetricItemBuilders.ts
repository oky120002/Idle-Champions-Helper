import type { AppLocale, MessageRef, TranslateParams } from '../../app/i18n'
import type { PageHeaderMetricItem } from '../PageHeaderMetrics'

interface WorkbenchMetricLabelTranslator {
  (text: string | MessageRef, params?: TranslateParams): string
}

interface CreateWorkbenchShowingMetricItemOptions {
  t: WorkbenchMetricLabelTranslator
  locale: AppLocale
  visibleCount: number
  filteredCount: number
  enUnitLabel: string
}

export function createWorkbenchShowingMetricItem({
  t,
  locale,
  visibleCount,
  filteredCount,
  enUnitLabel,
}: CreateWorkbenchShowingMetricItemOptions): PageHeaderMetricItem {
  return {
    label: t("当前展示"),
    value: locale === 'zh-CN'
      ? `${String(visibleCount)} / ${String(filteredCount)}`
      : t('{p0} / {p1} {p2}', {
          p0: String(visibleCount),
          p1: String(filteredCount),
          p2: enUnitLabel,
        }),
  }
}
