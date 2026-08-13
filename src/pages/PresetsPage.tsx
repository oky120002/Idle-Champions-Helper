 
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
        children: t("正在读取本地方案存档…"),
      },
      {
        id: 'error',
        when: 'error',
        tone: 'error',
        title: t("方案列表读取失败"),
        ...(state.status === 'error' ? { detail: state.message } : {}),
      },
    ],
  })
  const managementScopeSections: SurfaceCardContentSection[] = [
    {
      id: 'what-works-now',
      title: t("当前范围"),
      items: [
        {
          id: 'browse-presets',
          content: t("查看命名方案列表"),
        },
        {
          id: 'edit-presets',
          content: t("编辑方案名、备注、标签与优先级"),
        },
        {
          id: 'delete-presets',
          content: t("删除不再需要的方案"),
        },
        {
          id: 'restore-presets',
          content: t("把方案恢复回阵型页继续编辑"),
        },
      ],
    },
    {
      id: 'current-boundary',
      title: t("当前边界"),
      detail: t("最近草稿继续留在阵型页自动保存；这里管理的是已命名方案。若要新增方案，请回到阵型页点击“保存为方案”。"),
    },
  ]
  const toolbarItems: WorkbenchToolbarItemConfig[] = [
    createWorkbenchBadgeItem({
      id: 'preset-total',
      label: t("{p0} 条命名方案", { p0: String(metrics.total) }),
    }),
    createWorkbenchBadgeItem({
      id: 'preset-recoverable',
      tone: 'muted',
      label: t("{p0} 条可恢复", { p0: String(metrics.recoverable) }),
    }),
    createWorkbenchShareItem({
      t,
      state: shareLinkState,
      onCopy: copyCurrentLink,
    }),
  ]

  return (
    <ConfiguredWorkbenchPage
      pageClassName="presets-page"
      storageKey="presets"
      ariaLabel={t("方案存档工作台")}
      shellClassName="workbench-page__shell presets-workbench"
      contentScrollRef={contentScrollRef}
      floatingTopButton={
        showScrollTop
          ? {
              onClick: scrollToTop,
              detailLabel: t("方案内容"),
            }
          : undefined
      }
      toolbar={{
        sections: [
          {
            region: 'lead',
            section: {
              kind: 'mark',
              label: 'PRESETS',
              accentTone: 'steel',
            },
          },
          {
            region: 'primary',
            section: {
              kind: 'copy',
              kicker: t("归档工作台"),
              title: t("方案存档"),
              detail: t("统一查看、恢复和整理本地命名阵型方案"),
            },
          },
          {
            region: 'actions',
            section: {
              kind: 'items',
              items: toolbarItems,
            },
          },
        ],
      }}
      contentHeader={<StatusMessageBanner message={pageStatus} />}
    >
      <StatusBannerStack items={contentStatusItems} />

      {state.status === 'ready' ? (
        <WorkbenchContentStack>
          <SurfaceCardContentSections
            eyebrow={t("当前范围")}
            title={t("先确认当前支持的方案管理闭环")}
            description={t("命名方案继续由阵型页产出；这里负责浏览、编辑、删除与恢复。")}
            sections={managementScopeSections}
            layout="split"
          />

          <SurfaceCard
            eyebrow={t("已保存方案")}
            title={t("按最近编辑排序管理你的本地阵型方案")}
            description={t("恢复时会优先按保存时的数据版本校验；如果只能做兼容恢复，页面会明确提示。")}
          >
            {state.items.length === 0 ? (
              <StatusBannerStack
                items={[
                  {
                    id: 'empty-presets',
                    tone: 'info',
                    children: t("这里还没有命名方案。先去阵型页摆出一套阵容，再点击“保存为方案”。"),
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
