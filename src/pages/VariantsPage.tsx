import { FilterSidebarLayout } from '../components/filter-sidebar/FilterSidebarLayout'
import { PageTabHeader } from '../components/PageTabHeader'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { VariantsFilterBar } from './variants/VariantsFilterBar'
import { VariantsMetrics } from './variants/VariantsMetrics'
import { VariantsResultsSection } from './variants/VariantsResultsSection'
import { useVariantsPageModel } from './variants/useVariantsPageModel'

export function VariantsPage() {
  const model = useVariantsPageModel()
  const { state, t } = model

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
            sidebar={<VariantsFilterBar model={model} />}
            className="variants-workspace"
            contentClassName="variants-results"
          >
            <VariantsResultsSection model={model} />
          </FilterSidebarLayout>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
