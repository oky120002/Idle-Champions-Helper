import { useI18n } from '../../app/i18n'
import { SurfaceCard } from '../../components/SurfaceCard'
import { nextSteps, nonGoals, shippedItems } from './content'

export function HomeRoadmapCards() {
  const { t } = useI18n()

  return (
    <div className="card-grid card-grid--wide">
      <SurfaceCard
        eyebrow={t({ zh: '已落地', en: 'Shipped' })}
        title={t({ zh: '第一批基础设施', en: 'First infrastructure pass' })}
        description={t({
          zh: '这一批内容先解决工程可运行、可部署、可继续扩展的问题。',
          en: 'This batch focuses on keeping the project runnable, deployable, and easy to extend.',
        })}
      >
        <ul className="bullet-list">
          {shippedItems.map((item) => (
            <li key={item.zh}>{t(item)}</li>
          ))}
        </ul>
      </SurfaceCard>

      <SurfaceCard
        eyebrow={t({ zh: '接下来', en: 'Next' })}
        title={t({ zh: '下一条开发闭环', en: 'Next delivery loop' })}
        description={t({
          zh: '从真正能帮助决策的页面开始，而不是先堆大全套功能。',
          en: 'Start with pages that genuinely help decisions instead of piling on a giant feature list.',
        })}
      >
        <ol className="ordered-list">
          {nextSteps.map((item) => (
            <li key={item.zh}>{t(item)}</li>
          ))}
        </ol>
      </SurfaceCard>

      <SurfaceCard
        eyebrow={t({ zh: '约束', en: 'Boundaries' })}
        title={t({ zh: '当前明确不做的内容', en: 'What we are explicitly not doing yet' })}
        description={t({
          zh: '保持范围克制，先把站点的价值闭环做出来。',
          en: 'Keep the scope disciplined and build the site’s value loop before anything else.',
        })}
      >
        <ul className="bullet-list">
          {nonGoals.map((item) => (
            <li key={item.zh}>{t(item)}</li>
          ))}
        </ul>
      </SurfaceCard>
    </div>
  )
}
