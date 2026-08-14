import { ConfiguredWorkbenchMetricsHeader } from '../../components/workbench/ConfiguredWorkbenchMetricsHeader'
import { createWorkbenchShowingMetricItem } from '../../components/workbench/workbenchMetricItemBuilders'
import { collectChampionFacetSummary } from '../../features/champion-filters/headerMetrics'
import type { IllustrationsPageModel } from './types'

interface IllustrationsWorkbenchContentHeaderProps {
  readonly model: IllustrationsPageModel
}

export function IllustrationsWorkbenchContentHeader({ model }: IllustrationsWorkbenchContentHeaderProps) {
  const { t, activeFilters, results } = model
  const champions = Array.from(
    new Map(
      results.filteredIllustrationEntries.flatMap(({ champion }) =>
        champion ? [[champion.id, champion] as const] : [],
      ),
    ).values(),
  )
  const summary = collectChampionFacetSummary(champions, model.locale)
  const metricItems = [
    createWorkbenchShowingMetricItem({
      t,
      locale: model.locale,
      visibleCount: results.visibleIllustrationEntries.length,
      filteredCount: results.filteredIllustrationEntries.length,
      enUnitLabel: 'illustrations',
    }),
    { label: t("立绘总数"), value: results.illustrations.length },
    { label: t("覆盖英雄"), value: champions.length },
    { label: t("本体"), value: results.filteredHeroCount },
    { label: t("皮肤"), value: results.filteredSkinCount },
    { label: t("覆盖座位"), value: summary.seatCount },
    { label: t("联动队伍"), value: summary.affiliationCount },
    { label: t("种族"), value: summary.raceCount },
    { label: t("阵营"), value: summary.alignmentCount },
    { label: t("获取方式"), value: summary.acquisitionCount },
    { label: t("特殊机制"), value: summary.mechanicCount },
  ]

  return <ConfiguredWorkbenchMetricsHeader items={metricItems} activeFilters={activeFilters} />
}
