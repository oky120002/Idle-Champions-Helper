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
        eyebrow={t({ zh: '英雄筛选', en: 'Champion filters' })}
        title={t({ zh: '先用真实公共数据把查询入口跑起来', en: 'Make the real-data entry point feel instant' })}
        description={t({
          zh: '当前版本先接官方 definitions 归一化后的英雄数据，并保留官方原文与 `language_id=7` 中文展示名，优先把座位、定位、联动队伍和标签过滤闭环做通。',
          en: 'This pass uses normalized official definitions, keeps both official source names and `language_id=7` Chinese labels, and focuses on closing the loop on seat, role, affiliation, and tag filtering.',
        })}
        headerAside={state.status === 'ready' ? <ChampionsMetrics model={model} /> : null}
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
