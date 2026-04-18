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
            title={t({ zh: '按战役、限制与场景变化筛选官方变体', en: 'Filter official variants by campaign, restrictions, and battlefield shifts' })}
            description={t({
              zh: '先看战役与冒险分组，再快速扫阵型图、敌人结构和区域节奏，最后决定是否细看限制文本。',
              en: 'Start with the campaign and adventure grouping, scan the formation map, enemy mix, and area pacing, then decide which restriction sets deserve a closer read.',
            })}
            aside={state.status === 'ready' ? <VariantsMetrics model={model} /> : null}
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
          <>
            <div className="variants-workspace">
              <VariantsFilterBar model={model} />
              <VariantsResultsSection model={model} />
            </div>
          </>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
