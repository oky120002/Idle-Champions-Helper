import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { PageWorkbenchShell } from '../components/workbench/PageWorkbenchShell'
import {
  WorkbenchContentStack,
  WorkbenchShareButton,
  WorkbenchToolbarBadge,
  WorkbenchToolbarCopy,
  WorkbenchToolbarMark,
} from '../components/workbench/WorkbenchScaffold'
import { WorkbenchFloatingTopButton } from '../components/workbench/WorkbenchFloatingTopButton'
import { useWorkbenchScrollNavigation } from '../components/workbench/useWorkbenchScrollNavigation'
import { useWorkbenchShareLink } from '../components/workbench/useWorkbenchShareLink'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { PresetCard } from './presets/PresetCard'
import { usePresetsPageModel } from './presets/usePresetsPageModel'

export function PresetsPage() {
  const model = usePresetsPageModel()
  const location = useLocation()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const { showScrollTop, scrollToTop } = useWorkbenchScrollNavigation({ scrollRef: contentScrollRef })
  const { shareLinkState, copyCurrentLink } = useWorkbenchShareLink(location.pathname, location.search, location.hash)
  const { state, t, pageStatus, metrics } = model

  return (
    <div className="presets-page workbench-page">
      <PageWorkbenchShell
        storageKey="presets"
        ariaLabel={t({ zh: '方案存档工作台', en: 'Preset library workbench' })}
        className="workbench-page__shell presets-workbench"
        contentScrollRef={contentScrollRef}
        contentOverlay={
          showScrollTop ? (
            <WorkbenchFloatingTopButton
              onClick={scrollToTop}
              detailLabel={t({ zh: '方案内容', en: 'Preset pane' })}
            />
          ) : null
        }
        toolbarLead={<WorkbenchToolbarMark label="PRESETS" accentTone="steel" />}
        toolbarPrimary={(
          <WorkbenchToolbarCopy
            kicker={t({ zh: '归档工作台', en: 'Archive workbench' })}
            title={t({ zh: '方案存档', en: 'Preset library' })}
            detail={t({ zh: '统一查看、恢复和整理本地命名阵型方案', en: 'Review, restore, and curate named local formation presets' })}
          />
        )}
        toolbarActions={(
          <>
            <WorkbenchToolbarBadge>{t({ zh: `${metrics.total} 条命名方案`, en: `${metrics.total} presets` })}</WorkbenchToolbarBadge>
            <WorkbenchToolbarBadge tone="muted">
              {t({ zh: `${metrics.recoverable} 条可恢复`, en: `${metrics.recoverable} recoverable` })}
            </WorkbenchToolbarBadge>
            <WorkbenchShareButton state={shareLinkState} onCopy={copyCurrentLink} />
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
          <WorkbenchContentStack>
            <SurfaceCard
              eyebrow={t({ zh: '当前范围', en: 'Current scope' })}
              title={t({ zh: '先确认当前支持的方案管理闭环', en: 'Confirm the current preset management loop' })}
              description={t({ zh: '命名方案继续由阵型页产出；这里负责浏览、编辑、删除与恢复。', en: 'Named presets are still produced from the formation page, while this view focuses on browsing, editing, deleting, and restoring.' })}
            >
              <div className="split-grid">
                <div>
                  <h3 className="section-heading">{t({ zh: '当前范围', en: 'What works now' })}</h3>
                  <ul className="bullet-list">
                    <li>{t({ zh: '查看命名方案列表', en: 'Browse named presets' })}</li>
                    <li>{t({ zh: '编辑方案名、备注、标签与优先级', en: 'Edit names, notes, tags, and priority' })}</li>
                    <li>{t({ zh: '删除不再需要的方案', en: 'Delete presets you no longer need' })}</li>
                    <li>{t({ zh: '把方案恢复回阵型页继续编辑', en: 'Restore a preset back to the formation page' })}</li>
                  </ul>
                </div>
                <div>
                  <h3 className="section-heading">{t({ zh: '当前边界', en: 'Current boundary' })}</h3>
                  <p className="supporting-text">
                    {t({
                      zh: '最近草稿继续留在阵型页自动保存；这里管理的是已命名方案。若要新增方案，请回到阵型页点击“保存为方案”。',
                      en: 'Recent drafts remain on the formation page for auto-save; this page manages only named presets. To add one, go back to the formation page and choose “Save as preset.”',
                    })}
                  </p>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard
              eyebrow={t({ zh: '已保存方案', en: 'Saved presets' })}
              title={t({ zh: '按最近编辑排序管理你的本地阵型方案', en: 'Manage local formation presets sorted by latest edit' })}
              description={t({ zh: '恢复时会优先按保存时的数据版本校验；如果只能做兼容恢复，页面会明确提示。', en: 'Restore first validates against the saved data version, and the page clearly warns when only a compatible restore is possible.' })}
            >
              {state.items.length === 0 ? (
                <StatusBanner tone="info">
                  {t({
                    zh: '这里还没有命名方案。先去阵型页摆出一套阵容，再点击“保存为方案”。',
                    en: 'There are no named presets yet. Build a formation first, then click “Save as preset.”',
                  })}
                </StatusBanner>
              ) : (
                <div className="results-grid">
                  {state.items.map((view) => (
                    <PresetCard key={view.preset.id} model={model} view={view} />
                  ))}
                </div>
              )}
            </SurfaceCard>
          </WorkbenchContentStack>
        ) : null}
      </PageWorkbenchShell>
    </div>
  )
}
