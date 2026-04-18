import { PageTabHeader } from '../components/PageTabHeader'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { ChampionsMetrics } from './champions/ChampionsMetrics'
import { ChampionsResultsSection } from './champions/ChampionsResultsSection'
import { ChampionsSidebar } from './champions/ChampionsSidebar'
import { useChampionsPageModel } from './champions/useChampionsPageModel'

export function ChampionsPage() {
  const model = useChampionsPageModel()
  const { state, t, championsWorkspaceStyle } = model

  return (
    <div className="page-stack">
      <SurfaceCard
        headerContent={
          <PageTabHeader
            eyebrow={t({ zh: '英雄筛选', en: 'Champion filters' })}
            accentLabel="CHAMPIONS"
            title={t({ zh: '按座位、定位与联动快速缩小候选英雄', en: 'Narrow champion candidates by seat, role, and affiliation' })}
            description={t({
              zh: '先用高频条件缩小候选，再按身份、获取方式和机制标签补精度；点卡片进入详情，点“视觉档案”对照立绘资源。',
              en: 'Use the high-frequency filters first, then refine with identity, acquisition, and mechanic tags. Open the card for full details, or toggle the visual dossier to compare art assets.',
            })}
            aside={state.status === 'ready' ? <ChampionsMetrics model={model} /> : null}
          />
        }
      >
        {state.status === 'loading' ? (
          <StatusBanner tone="info">{t({ zh: '正在读取英雄数据…', en: 'Loading champion data…' })}</StatusBanner>
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '英雄数据读取失败', en: 'Champion data failed to load' })}
            detail={state.message || t({ zh: '未知错误', en: 'Unknown error' })}
          />
        ) : null}

        {state.status === 'ready' ? (
          <>
            <div className="champions-workspace" style={championsWorkspaceStyle}>
              <ChampionsSidebar model={model} />
              <ChampionsResultsSection model={model} />
            </div>
          </>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
