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
      title: t({ zh: '正在加载宠物目录', en: 'Loading pet catalog' }),
      detail: t({
        zh: '正在读取本地版本化的宠物清单、静态图像与动图索引。',
        en: 'Reading the local versioned pet manifest, static art, and motion preview manifest.',
      }),
    },
    error: {
      title: t({ zh: '宠物目录加载失败', en: 'Failed to load pet catalog' }),
      ...(state.status === 'error'
        ? {
            detail: state.message
              ? t({
                  zh: `无法读取 pets 数据：${state.message}`,
                  en: `Unable to read pets data: ${state.message}`,
                })
              : t({
                  zh: '无法读取 pets 数据。',
                  en: 'Unable to read pets data.',
                }),
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
      ariaLabel={t({ zh: '宠物图鉴工作台', en: 'Pet workbench' })}
      shellClassName="workbench-page__shell pets-workbench"
      contentScrollRef={model.resultsPaneRef}
      floatingTopButton={ui.showResultsQuickNavTop ? { onClick: actions.scrollResultsToTop } : undefined}
      toolbarIntro={{
        label: 'PETS',
        activeCount: activeFilterCount,
        title: t({ zh: '宠物图鉴', en: 'Pet catalog' }),
        detail: t({ zh: '宠物筛选与资源完整度排查', en: 'Filter pets and audit asset completeness' }),
      }}
      toolbarItems={toolbarItems}
      sidebarHeader={{
        kicker: t({ zh: '筛选抽屉', en: 'Filter drawer' }),
        statusLabel: t({ zh: '宠物筛选状态操作', en: 'Pet filter status actions' }),
        activeCount: activeFilterCount,
        clearLabel: t({ zh: '清空全部', en: 'Clear all' }),
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
