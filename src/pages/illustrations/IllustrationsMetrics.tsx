import { PageHeaderMetrics, type PageHeaderMetricItem } from '../../components/PageHeaderMetrics'
import { collectChampionFacetSummary } from '../../features/champion-filters/headerMetrics'
import type { IllustrationsPageModel } from './types'

interface IllustrationsMetricsProps {
  model: IllustrationsPageModel
}

export function IllustrationsMetrics({ model }: IllustrationsMetricsProps) {
  const { locale, results, t } = model
  const champions = Array.from(
    new Map(results.filteredIllustrationEntries.flatMap(({ champion }) => (champion ? [[champion.id, champion] as const] : []))).values(),
  )
  const summary = collectChampionFacetSummary(champions, locale)

  const items: PageHeaderMetricItem[] = [
    { label: t({ zh: '立绘总数', en: 'Illustrations' }), value: results.illustrations.length },
    { label: t({ zh: '当前匹配', en: 'Matches' }), value: results.filteredIllustrationEntries.length },
    { label: t({ zh: '覆盖英雄', en: 'Champions' }), value: champions.length },
    { label: t({ zh: '本体', en: 'Base' }), value: results.filteredHeroCount },
    { label: t({ zh: '皮肤', en: 'Skins' }), value: results.filteredSkinCount },
    { label: t({ zh: '覆盖座位', en: 'Seats' }), value: summary.seatCount },
    { label: t({ zh: '联动队伍', en: 'Affiliations' }), value: summary.affiliationCount },
    { label: t({ zh: '种族', en: 'Races' }), value: summary.raceCount },
    { label: t({ zh: '阵营', en: 'Alignments' }), value: summary.alignmentCount },
    { label: t({ zh: '获取方式', en: 'Availability' }), value: summary.acquisitionCount },
    { label: t({ zh: '特殊机制', en: 'Mechanics' }), value: summary.mechanicCount },
  ]

  return <PageHeaderMetrics items={items} variant="compact" />
}
