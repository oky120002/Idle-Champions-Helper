import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { ConfiguredWorkbenchPage } from '../components/workbench/ConfiguredWorkbenchPage'
import {
  WorkbenchContentStack,
} from '../components/workbench/WorkbenchScaffold'
import {
  type WorkbenchToolbarItemConfig,
} from '../components/workbench/WorkbenchToolbarItems'
import {
  createWorkbenchBadgeItem,
  createWorkbenchShareItem,
} from '../components/workbench/WorkbenchToolbarItemBuilders'
import { useWorkbenchScrollNavigation } from '../components/workbench/useWorkbenchScrollNavigation'
import { useWorkbenchShareLink } from '../components/workbench/useWorkbenchShareLink'
import { SurfaceCardContentSections, type SurfaceCardContentSection } from '../components/SurfaceCardContentSections'
import { StatusMessageBanner } from '../components/StatusMessageBanner'
import { StatusBannerStack, type StatusBannerStackItem } from '../components/StatusBannerStack'
import { createExclusiveStatusBannerItems } from '../components/statusBannerStackItemBuilders'
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
  const contentStatusItems: StatusBannerStackItem[] = createExclusiveStatusBannerItems({
    status: state.status,
    items: [
      {
        id: 'loading',
        when: 'loading',
        tone: 'info',
        children: t({ zh: '正在读取本地方案存档…', en: 'Loading local presets…' }),
      },
      {
        id: 'error',
        when: 'error',
        tone: 'error',
        title: t({ zh: '方案列表读取失败', en: 'Preset list failed to load' }),
        ...(state.status === 'error' ? { detail: state.message } : {}),
      },
    ],
  })
  const managementScopeSections: SurfaceCardContentSection[] = [
    {
      id: 'what-works-now',
      title: t({ zh: '当前范围', en: 'What works now' }),
      items: [
        {
          id: 'browse-presets',
          content: t({ zh: '查看命名方案列表', en: 'Browse named presets' }),
        },
        {
          id: 'edit-presets',
          content: t({ zh: '编辑方案名、备注、标签与优先级', en: 'Edit names, notes, tags, and priority' }),
        },
        {
          id: 'delete-presets',
          content: t({ zh: '删除不再需要的方案', en: 'Delete presets you no longer need' }),
        },
        {
          id: 'restore-presets',
          content: t({ zh: '把方案恢复回阵型页继续编辑', en: 'Restore a preset back to the formation page' }),
        },
      ],
    },
    {
      id: 'current-boundary',
      title: t({ zh: '当前边界', en: 'Current boundary' }),
      detail: t({
        zh: '最近草稿继续留在阵型页自动保存；这里管理的是已命名方案。若要新增方案，请回到阵型页点击“保存为方案”。',
        en: 'Recent drafts remain on the formation page for auto-save; this page manages only named presets. To add one, go back to the formation page and choose “Save as preset.”',
      }),
    },
  ]
  const toolbarItems: WorkbenchToolbarItemConfig[] = [
    createWorkbenchBadgeItem({
      id: 'preset-total',
      label: t({ zh: `${metrics.total} 条命名方案`, en: `${metrics.total} presets` }),
    }),
    createWorkbenchBadgeItem({
      id: 'preset-recoverable',
      tone: 'muted',
      label: t({ zh: `${metrics.recoverable} 条可恢复`, en: `${metrics.recoverable} recoverable` }),
    }),
    createWorkbenchShareItem({
      state: shareLinkState,
      onCopy: copyCurrentLink,
    }),
  ]

  return (
    <ConfiguredWorkbenchPage
      pageClassName="presets-page"
      storageKey="presets"
      ariaLabel={t({ zh: '方案存档工作台', en: 'Preset library workbench' })}
      shellClassName="workbench-page__shell presets-workbench"
      contentScrollRef={contentScrollRef}
      floatingTopButton={
        showScrollTop
          ? {
              onClick: scrollToTop,
              detailLabel: t({ zh: '方案内容', en: 'Preset pane' }),
            }
          : undefined
      }
      toolbarIntro={{
        mark: {
          label: 'PRESETS',
          accentTone: 'steel',
        },
        copy: {
          kicker: t({ zh: '归档工作台', en: 'Archive workbench' }),
          title: t({ zh: '方案存档', en: 'Preset library' }),
          detail: t({ zh: '统一查看、恢复和整理本地命名阵型方案', en: 'Review, restore, and curate named local formation presets' }),
        },
      }}
      toolbarItems={toolbarItems}
      contentHeader={<StatusMessageBanner message={pageStatus} />}
    >
      <StatusBannerStack items={contentStatusItems} />

      {state.status === 'ready' ? (
        <WorkbenchContentStack>
          <SurfaceCardContentSections
            eyebrow={t({ zh: '当前范围', en: 'Current scope' })}
            title={t({ zh: '先确认当前支持的方案管理闭环', en: 'Confirm the current preset management loop' })}
            description={t({ zh: '命名方案继续由阵型页产出；这里负责浏览、编辑、删除与恢复。', en: 'Named presets are still produced from the formation page, while this view focuses on browsing, editing, deleting, and restoring.' })}
            sections={managementScopeSections}
            layout="split"
          />

          <SurfaceCard
            eyebrow={t({ zh: '已保存方案', en: 'Saved presets' })}
            title={t({ zh: '按最近编辑排序管理你的本地阵型方案', en: 'Manage local formation presets sorted by latest edit' })}
            description={t({ zh: '恢复时会优先按保存时的数据版本校验；如果只能做兼容恢复，页面会明确提示。', en: 'Restore first validates against the saved data version, and the page clearly warns when only a compatible restore is possible.' })}
          >
            {state.items.length === 0 ? (
              <StatusBannerStack
                items={[
                  {
                    id: 'empty-presets',
                    tone: 'info',
                    children: t({
                      zh: '这里还没有命名方案。先去阵型页摆出一套阵容，再点击“保存为方案”。',
                      en: 'There are no named presets yet. Build a formation first, then click “Save as preset.”',
                    }),
                  },
                ]}
              />
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
    </ConfiguredWorkbenchPage>
  )
}
