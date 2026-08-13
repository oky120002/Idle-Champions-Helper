import { FilterWorkbenchPage } from '../components/workbench/FilterWorkbenchPage'
import {
  createWorkbenchBadgeItem,
  createWorkbenchShareItem,
} from '../components/workbench/WorkbenchToolbarItemBuilders'
import { createAsyncStatusBannerItems } from '../components/statusBannerStackItemBuilders'
import { VariantsNavigationSidebar } from './variants/VariantsNavigationSidebar'
import { VariantsResultsSection } from './variants/VariantsResultsSection'
import { useVariantsPageModel } from './variants/useVariantsPageModel'

export function VariantsPage() {
  const model = useVariantsPageModel()
  const { state, t, activeFilters, clearAllFilters, showResultsQuickNavTop, scrollResultsToTop } = model
  const contentStatusItems = createAsyncStatusBannerItems({
    status: state.status,
    loading: {
      children: t("正在读取官方变体数据…"),
    },
    error: {
      title: t("变体数据读取失败"),
      ...(state.status === 'error'
        ? { detail: state.message !== '' ? state.message : t("未知错误") }
        : {}),
    },
  })
  const toolbarItems = [
    createWorkbenchBadgeItem({
      id: 'campaign-count',
      label:
        state.status === 'ready'
          ? t("{p0} 地图", { p0: String(model.allCampaignGroups.length) })
          : t("读取中"),
      tone: 'muted',
    }),
    createWorkbenchBadgeItem({
      id: 'adventure-count',
      label: t("{p0} 关卡", { p0: String(model.selectedCampaignGroup?.adventures.length ?? 0) }),
      hidden: state.status !== 'ready',
    }),
    createWorkbenchBadgeItem({
      id: 'variant-count',
      label: t("{p0} 变体", { p0: String(model.selectedAdventureGroup?.variants.length ?? 0) }),
      hidden: state.status !== 'ready',
    }),
    createWorkbenchShareItem({
      t,
      state: model.shareLinkState,
      onCopy: model.copyCurrentLink,
    }),
  ]

  return (
    <FilterWorkbenchPage
      pageClassName="variants-page"
      storageKey="variants"
      ariaLabel={t("变体筛选工作台")}
      shellClassName="workbench-page__shell variants-workbench"
      contentScrollRef={model.resultsPaneRef}
      floatingTopButton={showResultsQuickNavTop ? { onClick: scrollResultsToTop } : undefined}
      toolbar={{
        sections: [
          {
            region: 'lead',
            section: {
              kind: 'filter-status',
              label: 'VARIANTS',
              activeCount: activeFilters.length,
              accentTone: 'steel',
            },
          },
          {
            region: 'primary',
            section: {
              kind: 'copy',
              title: t("变体筛选"),
              detail: t("左侧选地图和关卡，右侧读敌人、区域、阵型与变体"),
            },
          },
          {
            region: 'actions',
            section: {
              kind: 'items',
              items: toolbarItems,
              layout: 'cluster',
            },
          },
        ],
      }}
      sidebarHeader={{
        kicker: t("导航抽屉"),
        statusLabel: t("变体筛选状态操作"),
        activeCount: activeFilters.length,
        clearLabel: t("清空全部"),
        ...(activeFilters.length > 0 ? { onClear: clearAllFilters } : {}),
      }}
      isReady={state.status === 'ready'}
      sidebar={<VariantsNavigationSidebar model={model} />}
      statusItems={contentStatusItems}
    >
      <VariantsResultsSection model={model} />
    </FilterWorkbenchPage>
  )
}
