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
      eyebrow: t({ zh: '已落地', en: 'Shipped' }),
      title: t({ zh: '第一批基础设施', en: 'First infrastructure pass' }),
      description: t({
        zh: '这一批内容先解决工程可运行、可部署、可继续扩展的问题。',
        en: 'This batch focuses on keeping the project runnable, deployable, and easy to extend.',
      }),
      sections: [
        {
          id: 'shipped-items',
          items: shippedItems.map((item, index) => ({
            id: `shipped-${index}`,
            content: t(item),
          })),
        },
      ],
    },
    {
      id: 'next',
      eyebrow: t({ zh: '接下来', en: 'Next' }),
      title: t({ zh: '下一条开发闭环', en: 'Next delivery loop' }),
      description: t({
        zh: '从真正能帮助决策的页面开始，而不是先堆大全套功能。',
        en: 'Start with pages that genuinely help decisions instead of piling on a giant feature list.',
      }),
      sections: [
        {
          id: 'next-steps',
          listVariant: 'ordered' as const,
          items: nextSteps.map((item, index) => ({
            id: `next-${index}`,
            content: t(item),
          })),
        },
      ],
    },
    {
      id: 'boundaries',
      eyebrow: t({ zh: '约束', en: 'Boundaries' }),
      title: t({ zh: '当前明确不做的内容', en: 'What we are explicitly not doing yet' }),
      description: t({
        zh: '保持范围克制，先把站点的价值闭环做出来。',
        en: 'Keep the scope disciplined and build the site’s value loop before anything else.',
      }),
      sections: [
        {
          id: 'non-goals',
          items: nonGoals.map((item, index) => ({
            id: `non-goal-${index}`,
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
