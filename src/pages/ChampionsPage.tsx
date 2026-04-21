import { FilterSidebarLayout } from '../components/filter-sidebar/FilterSidebarLayout'
import { FilterSidebarToolbar } from '../components/filter-sidebar/FilterSidebarToolbar'
import { PageTabHeader } from '../components/PageTabHeader'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { ChampionsMetrics } from './champions/ChampionsMetrics'
import { ChampionsResultsSection } from './champions/ChampionsResultsSection'
import { ChampionsSidebar } from './champions/ChampionsSidebar'
import { useChampionsPageModel } from './champions/useChampionsPageModel'

export function ChampionsPage() {
  const model = useChampionsPageModel()
  const { state, t, activeFilterChips, hasActiveFilters, clearAllFilters } = model
  const activeFilterCount = activeFilterChips.length

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
            toolbar={
              <FilterSidebarToolbar
                title={t({ zh: '英雄筛选抽屉', en: 'Champion filter drawer' })}
                description={t({
                  zh: '左侧条件按需滑出，收起后让结果列表完整吃满横向空间。',
                  en: 'Slide the left-side controls in only when you need them, and let the results take the full width when closed.',
                })}
                status={
                  <span className="filter-sidebar-toolbar__badge">
                    {activeFilterCount > 0
                      ? t({ zh: `${activeFilterCount} 项已启用`, en: `${activeFilterCount} active` })
                      : t({ zh: '当前未启用条件', en: 'No active filters' })}
                  </span>
                }
                actions={
                  hasActiveFilters ? (
                    <button
                      type="button"
                      className="action-button action-button--secondary action-button--compact"
                      onClick={clearAllFilters}
                    >
                      {t({ zh: '清空全部', en: 'Clear all' })}
                    </button>
                  ) : null
                }
              />
            }
          >
            <ChampionsResultsSection model={model} />
          </FilterSidebarLayout>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
