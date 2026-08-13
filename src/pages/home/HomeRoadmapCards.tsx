import { useI18n } from '../../app/i18n'
import { SurfaceCardContentSections, type SurfaceCardContentSection } from '../../components/SurfaceCardContentSections'
import { nextSteps, nonGoals, shippedItems } from './content'

type RoadmapCard = {
  id: string
  eyebrow: string
  title: string
  description: string
  sections: SurfaceCardContentSection[]
}

export function HomeRoadmapCards() {
  const { t } = useI18n()
  const roadmapCards: RoadmapCard[] = [
    {
      id: 'shipped',
      eyebrow: t("已落地"),
      title: t("第一批基础设施"),
      description: t("这一批内容先解决工程可运行、可部署、可继续扩展的问题。"),
      sections: [
        {
          id: 'shipped-items',
          items: shippedItems.map((item, index) => ({
            id: `shipped-${String(index)}`,
            content: t(item),
          })),
        },
      ],
    },
    {
      id: 'next',
      eyebrow: t("接下来"),
      title: t("下一条开发闭环"),
      description: t("从真正能帮助决策的页面开始，而不是先堆大全套功能。"),
      sections: [
        {
          id: 'next-steps',
          listVariant: 'ordered' as const,
          items: nextSteps.map((item, index) => ({
            id: `next-${String(index)}`,
            content: t(item),
          })),
        },
      ],
    },
    {
      id: 'boundaries',
      eyebrow: t("约束"),
      title: t("当前明确不做的内容"),
      description: t("保持范围克制，先把站点的价值闭环做出来。"),
      sections: [
        {
          id: 'non-goals',
          items: nonGoals.map((item, index) => ({
            id: `non-goal-${String(index)}`,
            content: t(item),
          })),
        },
      ],
    },
  ]

  return (
    <div className="card-grid card-grid--wide">
      {roadmapCards.map((card) => (
        <SurfaceCardContentSections
          key={card.id}
          eyebrow={card.eyebrow}
          title={card.title}
          description={card.description}
          sections={card.sections}
        />
      ))}
    </div>
  )
}
