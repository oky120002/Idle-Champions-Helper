import { PageTabHeader } from '../components/PageTabHeader'
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
        headerContent={
          <PageTabHeader
            eyebrow={t({ zh: '方案存档', en: 'Presets' })}
            accentLabel="PRESETS"
            title={t({ zh: '管理保存在当前浏览器里的命名阵型方案', en: 'Manage named formation presets stored in the current browser' })}
            description={t({
              zh: '最近草稿和正式方案分层管理；恢复时会先校验数据版本，再决定是原样恢复还是兼容恢复。',
              en: 'Recent drafts and named presets stay separate. Restore validates the saved data version first, then decides whether to do a direct or compatibility restore.',
            })}
            aside={state.status === 'ready' ? <PresetsMetrics model={model} /> : null}
          />
        }
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
