import { FilterSidebarLayout } from '../components/filter-sidebar/FilterSidebarLayout'
import { PageTabHeader } from '../components/PageTabHeader'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { ChampionsMetrics } from './champions/ChampionsMetrics'
import { ChampionsResultsSection } from './champions/ChampionsResultsSection'
import { ChampionsSidebar } from './champions/ChampionsSidebar'
import { useChampionsPageModel } from './champions/useChampionsPageModel'

export function ChampionsPage() {
  const model = useChampionsPageModel()
  const { state, t } = model

  return (
    <div className="page-stack">
      <SurfaceCard
        headerContent={
          <PageTabHeader
            eyebrow={t({ zh: '英雄筛选', en: 'Champion filters' })}
            accentLabel="CHAMPIONS"
            aside={state.status === 'ready' ? <ChampionsMetrics model={model} /> : null}
            layout="headline"
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
          <FilterSidebarLayout
            storageKey="champions"
            sidebar={<ChampionsSidebar model={model} />}
            className="champions-workspace"
          >
            <ChampionsResultsSection model={model} />
          </FilterSidebarLayout>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
