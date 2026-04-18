import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { PresetsListSection } from './presets/PresetsListSection'
import { PresetsMetrics } from './presets/PresetsMetrics'
import { PresetsOverview } from './presets/PresetsOverview'
import { usePresetsPageModel } from './presets/usePresetsPageModel'

export function PresetsPage() {
  const model = usePresetsPageModel()
  const { state, t, pageStatus } = model

  return (
    <div className="page-stack">
      <SurfaceCard
        eyebrow={t({ zh: '方案存档', en: 'Presets' })}
        title={t({ zh: '命名方案已落到浏览器本地 IndexedDB', en: 'Named presets now live in browser-local IndexedDB' })}
        description={t({
          zh: '命名方案与最近草稿分层管理；这里的所有内容都只保存在当前浏览器，不上传到外部服务。',
          en: 'Named presets are managed separately from recent drafts. Everything here stays in the current browser and never uploads elsewhere.',
        })}
        headerAside={state.status === 'ready' ? <PresetsMetrics model={model} /> : null}
      >
        {state.status === 'loading' ? (
          <StatusBanner tone="info">{t({ zh: '正在读取本地方案存档…', en: 'Loading local presets…' })}</StatusBanner>
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '方案列表读取失败', en: 'Preset list failed to load' })}
            detail={state.message}
          />
        ) : null}

        {state.status === 'ready' ? (
          <>
            {pageStatus ? <StatusBanner tone={pageStatus.tone} title={pageStatus.title} detail={pageStatus.detail} /> : null}
            <PresetsOverview model={model} />
          </>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        eyebrow={t({ zh: '已保存方案', en: 'Saved presets' })}
        title={t({ zh: '按最近编辑排序管理你的本地阵型方案', en: 'Manage local formation presets sorted by latest edit' })}
        description={t({
          zh: '恢复时会优先按保存时的数据版本校验；如果只能做兼容恢复，页面会明确提示。',
          en: 'Restore first validates against the saved data version, and the page clearly warns when only a compatible restore is possible.',
        })}
      >
        <PresetsListSection model={model} />
      </SurfaceCard>
    </div>
  )
}
