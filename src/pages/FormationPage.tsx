import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { ConfiguredWorkbenchPage } from '../components/workbench/ConfiguredWorkbenchPage'
import {
  WorkbenchContentStack,
  WorkbenchSidebarHeader,
  WorkbenchSidebarLoading,
  WorkbenchToolbarBadge,
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
import { StatusBannerStack } from '../components/StatusBannerStack'
import { createAsyncStatusBannerItems } from '../components/statusBannerStackItemBuilders'
import { FormationBoardEditor } from './formation/FormationBoardEditor'
import { FormationDraftBanner } from './formation/FormationDraftBanner'
import { FormationLayoutFilters } from './formation/FormationLayoutFilters'
import { FormationPresetCard } from './formation/FormationPresetCard'
import { useFormationPageModel } from './formation/useFormationPageModel'

export function FormationPage() {
  const model = useFormationPageModel()
  const location = useLocation()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const { showScrollTop, scrollToTop } = useWorkbenchScrollNavigation({ scrollRef: contentScrollRef })
  const { shareLinkState, copyCurrentLink } = useWorkbenchShareLink(location.pathname, location.search, location.hash)
  const activeSidebarFilterCount = (model.layoutSearch.trim() !== '' ? 1 : 0) + (model.selectedContextKind === 'all' ? 0 : 1)
  const contentStatusItems = createAsyncStatusBannerItems({
    status: model.state.status,
    loading: {
      children: model.t("正在读取阵型布局和英雄数据…"),
    },
    error: {
      title: model.t("阵型数据读取失败"),
      ...(model.state.status === 'error' ? { detail: model.state.message } : {}),
    },
  })
  const toolbarItems: WorkbenchToolbarItemConfig[] = [
    createWorkbenchBadgeItem({
      id: 'selected-layout',
      label: model.selectedLayoutLabel ?? model.t("未选择布局"),
    }),
    createWorkbenchBadgeItem({
      id: 'placed-count',
      tone: 'muted',
      label: model.t("{p0} 名已放置", { p0: String(model.selectedChampions.length) }),
    }),
    createWorkbenchShareItem({
      t: model.t,
      state: shareLinkState,
      onCopy: copyCurrentLink,
    }),
  ]

  return (
    <ConfiguredWorkbenchPage
      pageClassName="formation-page"
      storageKey="formation"
      ariaLabel={model.t("阵型编辑工作台")}
      shellClassName="workbench-page__shell formation-workbench"
      contentScrollRef={contentScrollRef}
      floatingTopButton={
        showScrollTop
          ? {
              onClick: scrollToTop,
              detailLabel: model.t("阵型内容"),
            }
          : undefined
      }
      toolbar={{
        sections: [
          {
            region: 'lead',
            section: {
              kind: 'mark',
              label: 'FORMATION',
            },
          },
          {
            region: 'primary',
            section: {
              kind: 'copy',
              kicker: model.t("战术工作台"),
              title: model.t("阵型编辑"),
              detail: model.t("左侧筛选布局，右侧编辑当前阵型与方案摘要"),
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
      sidebarHeader={
        model.state.status === 'ready' ? (
          <WorkbenchSidebarHeader
            kicker={model.t("布局抽屉")}
            statusLabel={model.t("布局筛选状态")}
            status={(
              <WorkbenchToolbarBadge>
                {activeSidebarFilterCount > 0
                  ? model.t("{p0} 项条件", { p0: String(activeSidebarFilterCount) })
                  : model.t("布局筛选待命")}
              </WorkbenchToolbarBadge>
            )}
          />
        ) : null
      }
      sidebar={
        model.state.status === 'ready' ? (
          <FormationLayoutFilters model={model} />
        ) : (
          <WorkbenchSidebarLoading />
        )
      }
      contentHeader={model.state.status === 'ready' ? <FormationDraftBanner model={model} /> : null}
    >
      <StatusBannerStack items={contentStatusItems} />

      {model.state.status === 'ready' ? (
        <WorkbenchContentStack>
          <FormationBoardEditor model={model} />
          <FormationPresetCard model={model} />
        </WorkbenchContentStack>
      ) : null}
    </ConfiguredWorkbenchPage>
  )
}
