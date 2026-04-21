import { FilterSidebarLayout } from '../components/filter-sidebar/FilterSidebarLayout'
import { FilterSidebarToolbar } from '../components/filter-sidebar/FilterSidebarToolbar'
import { PageTabHeader } from '../components/PageTabHeader'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { VariantsFilterBar } from './variants/VariantsFilterBar'
import { VariantsMetrics } from './variants/VariantsMetrics'
import { VariantsResultsSection } from './variants/VariantsResultsSection'
import { useVariantsPageModel } from './variants/useVariantsPageModel'

export function VariantsPage() {
  const model = useVariantsPageModel()
  const { state, t, activeFilters, clearAllFilters } = model

  return (
    <div className="page-stack">
      <SurfaceCard
        className="variants-page"
        headerContent={
          <PageTabHeader
            eyebrow={t({ zh: '变体筛选', en: 'Variant filters' })}
            accentLabel="VARIANTS"
            aside={state.status === 'ready' ? <VariantsMetrics model={model} /> : null}
            layout="headline"
          />
        }
      >
        {state.status === 'loading' ? (
          <StatusBanner tone="info">{t({ zh: '正在读取官方变体数据…', en: 'Loading official variant data…' })}</StatusBanner>
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '变体数据读取失败', en: 'Variant data failed to load' })}
            detail={state.message || t({ zh: '未知错误', en: 'Unknown error' })}
          />
        ) : null}

        {state.status === 'ready' ? (
          <FilterSidebarLayout
            storageKey="variants"
            sidebar={<VariantsFilterBar model={model} />}
            className="variants-workspace"
            contentClassName="variants-results"
            toolbar={
              <FilterSidebarToolbar
                title={t({ zh: '变体筛选抽屉', en: 'Variant filter drawer' })}
                description={t({
                  zh: '让左侧范围条件像抽屉一样按需滑出，右侧结果继续完整铺开对比限制压力。',
                  en: 'Use the left-side range controls like a drawer, so the right side can stay fully open for comparing variant pressure.',
                })}
                status={
                  <span className="filter-sidebar-toolbar__badge">
                    {activeFilters.length > 0
                      ? t({ zh: `${activeFilters.length} 项已启用`, en: `${activeFilters.length} active` })
                      : t({ zh: '当前未启用条件', en: 'No active filters' })}
                  </span>
                }
                actions={
                  activeFilters.length > 0 ? (
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
            <VariantsResultsSection model={model} />
          </FilterSidebarLayout>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
