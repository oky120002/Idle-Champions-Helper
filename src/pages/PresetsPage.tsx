import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { PageWorkbenchShell } from '../components/workbench/PageWorkbenchShell'
import { WorkbenchFloatingTopButton } from '../components/workbench/WorkbenchFloatingTopButton'
import { useWorkbenchScrollNavigation } from '../components/workbench/useWorkbenchScrollNavigation'
import { useWorkbenchShareLink } from '../components/workbench/useWorkbenchShareLink'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { PresetsListSection } from './presets/PresetsListSection'
import { PresetsOverview } from './presets/PresetsOverview'
import { usePresetsPageModel } from './presets/usePresetsPageModel'

export function PresetsPage() {
  const model = usePresetsPageModel()
  const location = useLocation()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const { showScrollTop, scrollToTop } = useWorkbenchScrollNavigation({ scrollRef: contentScrollRef })
  const { shareLinkState, copyCurrentLink } = useWorkbenchShareLink(location.pathname, location.search, location.hash)
  const { state, t, pageStatus, metrics } = model
  const shareButtonLabel =
    shareLinkState === 'success'
      ? t({ zh: '链接已复制', en: 'Link copied' })
      : shareLinkState === 'error'
        ? t({ zh: '复制失败', en: 'Copy failed' })
        : t({ zh: '复制当前链接', en: 'Copy current link' })

  return (
    <div className="presets-page presets-page--workbench">
      <PageWorkbenchShell
        storageKey="presets"
        ariaLabel={t({ zh: '方案存档工作台', en: 'Preset library workbench' })}
        className="presets-workbench"
        contentScrollRef={contentScrollRef}
        contentOverlay={
          showScrollTop ? (
            <WorkbenchFloatingTopButton
              onClick={scrollToTop}
              detailLabel={t({ zh: '方案内容', en: 'Preset pane' })}
            />
          ) : null
        }
        toolbarLead={(
          <div className="presets-workbench__toolbar-mark" aria-hidden="true">
            <span className="presets-workbench__toolbar-mark-dot" />
            <span className="presets-workbench__toolbar-mark-label">PRESETS</span>
          </div>
        )}
        toolbarPrimary={(
          <div className="presets-workbench__toolbar-copy">
            <span className="presets-workbench__toolbar-kicker">{t({ zh: '归档工作台', en: 'Archive workbench' })}</span>
            <strong className="presets-workbench__toolbar-title">{t({ zh: '方案存档', en: 'Preset library' })}</strong>
            <span className="presets-workbench__toolbar-detail">
              {t({ zh: '统一查看、恢复和整理本地命名阵型方案', en: 'Review, restore, and curate named local formation presets' })}
            </span>
          </div>
        )}
        toolbarActions={(
          <>
            <span className="presets-workbench__toolbar-badge">{t({ zh: `${metrics.total} 条命名方案`, en: `${metrics.total} presets` })}</span>
            <span className="presets-workbench__toolbar-badge presets-workbench__toolbar-badge--muted">
              {t({ zh: `${metrics.recoverable} 条可恢复`, en: `${metrics.recoverable} recoverable` })}
            </span>
            <button
              type="button"
              className={
                shareLinkState === 'success'
                  ? 'action-button action-button--ghost action-button--compact action-button--toggled'
                  : 'action-button action-button--ghost action-button--compact'
              }
              onClick={() => {
                void copyCurrentLink()
              }}
            >
              {shareButtonLabel}
            </button>
          </>
        )}
        contentHeader={pageStatus ? <StatusBanner tone={pageStatus.tone} title={pageStatus.title} detail={pageStatus.detail} /> : null}
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
          <div className="presets-workbench__content-stack">
            <SurfaceCard
              eyebrow={t({ zh: '当前范围', en: 'Current scope' })}
              title={t({ zh: '先确认当前支持的方案管理闭环', en: 'Confirm the current preset management loop' })}
              description={t({ zh: '命名方案继续由阵型页产出；这里负责浏览、编辑、删除与恢复。', en: 'Named presets are still produced from the formation page, while this view focuses on browsing, editing, deleting, and restoring.' })}
            >
              <PresetsOverview model={model} />
            </SurfaceCard>

            <SurfaceCard
              eyebrow={t({ zh: '已保存方案', en: 'Saved presets' })}
              title={t({ zh: '按最近编辑排序管理你的本地阵型方案', en: 'Manage local formation presets sorted by latest edit' })}
              description={t({ zh: '恢复时会优先按保存时的数据版本校验；如果只能做兼容恢复，页面会明确提示。', en: 'Restore first validates against the saved data version, and the page clearly warns when only a compatible restore is possible.' })}
            >
              <PresetsListSection model={model} />
            </SurfaceCard>
          </div>
        ) : null}
      </PageWorkbenchShell>
    </div>
  )
}
