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
        eyebrow={t({ zh: '变体限制', en: 'Variant restrictions' })}
        title={t({ zh: '先把官方中文展示和原文回退一起接上', en: 'Show official Chinese labels while keeping source-text fallback' })}
        description={t({
          zh: '当前先接官方 definitions 归一化后的变体数据，名称、战役和限制文本都优先显示 `language_id=7` 中文，并保留官方原文用于检索和回退。',
          en: 'This page uses normalized official definitions, prefers `language_id=7` Chinese for names, campaigns, and restriction text, and still keeps the original strings for search and fallback.',
        })}
      >
        {state.status === 'loading' ? (
          <StatusBanner tone="info">{t({ zh: '正在读取变体数据…', en: 'Loading variant data…' })}</StatusBanner>
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
            <VariantsFilterBar model={model} />
            <VariantsResultsSection model={model} />
          </>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
