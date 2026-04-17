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
        eyebrow={t({ zh: '变体筛选', en: 'Variant filters' })}
        title={t({ zh: '按官方战役结构筛变体，再看阵型与区域节奏', en: 'Filter variants by official campaign structure, then scan formations and area pacing' })}
        description={t({
          zh: '这一页只消费游戏官方基座归一化后的战役、冒险、怪物与阵型数据。参考站只借了信息排布思路，实际筛选与展示都来自官方 definitions。',
          en: 'This page consumes only normalized official campaign, adventure, monster, and formation data. Reference sites inform the layout direction, but the actual filtering and rendering come from official definitions.',
        })}
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
            <VariantsMetrics model={model} />
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
