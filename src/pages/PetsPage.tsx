import { FilterWorkbenchPage } from '../components/workbench/FilterWorkbenchPage'
import {
  createWorkbenchFilterToolbarItems,
} from '../components/workbench/WorkbenchToolbarItemBuilders'
import { createAsyncStatusBannerItems } from '../components/statusBannerStackItemBuilders'
import { PetFilters } from './pets/PetFilters'
import { MAX_VISIBLE_PETS } from './pets/constants'
import { PetsResultsSection } from './pets/PetsResultsSection'
import { PetsWorkbenchContentHeader } from './pets/PetsWorkbenchContentHeader'
import { usePetsPageModel } from './pets/usePetsPageModel'

export function PetsPage() {
  const model = usePetsPageModel()
  const { state, t, activeFilterCount, filters, actions, ui } = model
  const contentStatusItems = createAsyncStatusBannerItems({
    status: state.status,
    loading: {
      title: t("正在加载宠物目录"),
      detail: t("正在读取本地版本化的宠物清单、静态图像与动图索引。"),
    },
    error: {
      title: t("宠物目录加载失败"),
      ...(state.status === 'error'
        ? {
            detail: state.message !== ''
              ? t("无法读取 pets 数据：{p0}", { p0: state.message })
              : t("无法读取 pets 数据。"),
          }
        : {}),
    },
  })
  const toolbarItems = createWorkbenchFilterToolbarItems({
    t,
    defaultVisibleCount: MAX_VISIBLE_PETS,
    filteredCount: model.results.filteredPets.length,
    showAllResults: filters.showAllResults,
    canToggle: model.results.canToggleResultVisibility,
    isReady: state.status === 'ready',
    onToggleVisibility: actions.toggleResultVisibility,
    shareState: ui.shareLinkState,
    onCopy: actions.copyCurrentLink,
    shuffle: {
      hasRandomOrder: ui.hasRandomOrder,
      onShuffle: actions.randomizeResultOrder,
    },
  })

  return (
    <FilterWorkbenchPage
      pageClassName="pets-page"
      storageKey="pets"
      ariaLabel={t("宠物图鉴工作台")}
      shellClassName="workbench-page__shell pets-workbench"
      contentScrollRef={model.resultsPaneRef}
      floatingTopButton={ui.showResultsQuickNavTop ? { onClick: actions.scrollResultsToTop } : undefined}
      toolbar={{
        sections: [
          {
            region: 'lead',
            section: {
              kind: 'filter-status',
              label: 'PETS',
              activeCount: activeFilterCount,
            },
          },
          {
            region: 'primary',
            section: {
              kind: 'copy',
              title: t("宠物图鉴"),
              detail: t("宠物筛选与资源完整度排查"),
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
        kicker: t("筛选抽屉"),
        statusLabel: t("宠物筛选状态操作"),
        activeCount: activeFilterCount,
        clearLabel: t("清空全部"),
        ...(activeFilterCount > 0 ? { onClear: actions.clearAllFilters } : {}),
      }}
      isReady={state.status === 'ready'}
      sidebar={(
        <PetFilters
          query={filters.query}
          sourceFilter={filters.sourceFilter}
          assetFilter={filters.assetFilter}
          onQueryChange={actions.updateQuery}
          onSourceFilterChange={actions.updateSourceFilter}
          onAssetFilterChange={actions.updateAssetFilter}
        />
      )}
      contentHeader={<PetsWorkbenchContentHeader model={model} />}
      statusItems={contentStatusItems}
    >
      <PetsResultsSection model={model} />
    </FilterWorkbenchPage>
  )
}
