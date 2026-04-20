import { PageHeaderMetrics, type PageHeaderMetricItem } from '../../components/PageHeaderMetrics'
import { useI18n } from '../../app/i18n'

interface PetsMetricsProps {
  summary: {
    total: number
    gems: number
    premium: number
    patron: number
    unavailable: number
    completeArt: number
  }
}

export function PetsMetrics({ summary }: PetsMetricsProps) {
  const { t } = useI18n()

  const items: PageHeaderMetricItem[] = [
    { label: t({ zh: '宠物总数', en: 'Pets' }), value: summary.total },
    { label: t({ zh: '完整图像', en: 'Full art' }), value: summary.completeArt },
    { label: t({ zh: '宝石商店', en: 'Gem shop' }), value: summary.gems },
    { label: t({ zh: '付费来源', en: 'Premium' }), value: summary.premium },
    { label: t({ zh: '赞助商商店', en: 'Patron shop' }), value: summary.patron },
    { label: t({ zh: '暂未开放', en: 'Unavailable' }), value: summary.unavailable },
  ]

  return <PageHeaderMetrics items={items} variant="compact" />
}
