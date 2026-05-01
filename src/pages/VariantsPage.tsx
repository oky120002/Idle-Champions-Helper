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
      children: t({ zh: '正在读取官方变体数据…', en: 'Loading official variant data…' }),
    },
    error: {
      title: t({ zh: '变体数据读取失败', en: 'Variant data failed to load' }),
      ...(state.status === 'error'
        ? { detail: state.message || t({ zh: '未知错误', en: 'Unknown error' }) }
        : {}),
    },
  })
  const toolbarItems = [
    createWorkbenchBadgeItem({
      id: 'campaign-count',
      label:
        state.status === 'ready'
          ? t({ zh: `${model.allCampaignGroups.length} 地图`, en: `${model.allCampaignGroups.length} campaigns` })
          : t({ zh: '读取中', en: 'Loading' }),
      tone: 'muted',
    }),
    createWorkbenchBadgeItem({
      id: 'adventure-count',
      label: t({
        zh: `${model.selectedCampaignGroup?.adventures.length ?? 0} 关卡`,
        en: `${model.selectedCampaignGroup?.adventures.length ?? 0} adventures`,
      }),
      hidden: state.status !== 'ready',
    }),
    createWorkbenchBadgeItem({
      id: 'variant-count',
      label: t({
        zh: `${model.selectedAdventureGroup?.variants.length ?? 0} 变体`,
        en: `${model.selectedAdventureGroup?.variants.length ?? 0} variants`,
      }),
      hidden: state.status !== 'ready',
    }),
    createWorkbenchShareItem({
      state: model.shareLinkState,
      onCopy: model.copyCurrentLink,
    }),
  ]

  return (
    <FilterWorkbenchPage
      pageClassName="variants-page"
      storageKey="variants"
      ariaLabel={t({ zh: '变体筛选工作台', en: 'Variant workbench' })}
      shellClassName="workbench-page__shell variants-workbench"
      contentScrollRef={model.resultsPaneRef}
      floatingTopButton={showResultsQuickNavTop ? { onClick: scrollResultsToTop } : undefined}
      toolbarIntro={{
        label: 'VARIANTS',
        activeCount: activeFilters.length,
        accentTone: 'steel',
        title: t({ zh: '变体筛选', en: 'Variant filters' }),
        detail: t({ zh: '左侧选地图和关卡，右侧读敌人、区域、阵型与变体', en: 'Choose a campaign and adventure on the left; read enemies, areas, formation, and variants on the right' }),
      }}
      toolbarItems={toolbarItems}
      sidebarHeader={{
        kicker: t({ zh: '导航抽屉', en: 'Navigation drawer' }),
        statusLabel: t({ zh: '变体筛选状态操作', en: 'Variant filter status actions' }),
        activeCount: activeFilters.length,
        clearLabel: t({ zh: '清空全部', en: 'Clear all' }),
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
