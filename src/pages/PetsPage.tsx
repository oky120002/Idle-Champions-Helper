import { FilterWorkbenchPage } from '../components/workbench/FilterWorkbenchPage'
import {
  WorkbenchToolbarCopy,
  WorkbenchToolbarFilterStatus,
} from '../components/workbench/WorkbenchScaffold'
import {
  createWorkbenchResultVisibilityItem,
  createWorkbenchShareItem,
  createWorkbenchShuffleItem,
} from '../components/workbench/WorkbenchToolbarItemBuilders'
import {
  WorkbenchToolbarItems,
  type WorkbenchToolbarItemConfig,
} from '../components/workbench/WorkbenchToolbarItems'
import { WorkbenchFloatingTopButton } from '../components/workbench/WorkbenchFloatingTopButton'
import type { StatusBannerStackItem } from '../components/StatusBannerStack'
import { PetFilters } from './pets/PetFilters'
import { MAX_VISIBLE_PETS } from './pets/constants'
import { PetsResultsSection } from './pets/PetsResultsSection'
import { PetsWorkbenchContentHeader } from './pets/PetsWorkbenchContentHeader'
import { usePetsPageModel } from './pets/usePetsPageModel'

export function PetsPage() {
  const model = usePetsPageModel()
  const { state, t, activeFilterCount, filters, actions, ui } = model
  const contentStatusItems: StatusBannerStackItem[] = [
    {
      id: 'loading',
      tone: 'info',
      title: t({ zh: '正在加载宠物目录', en: 'Loading pet catalog' }),
      detail: t({
        zh: '正在读取本地版本化的宠物清单、静态图像与动图索引。',
        en: 'Reading the local versioned pet manifest, static art, and motion preview manifest.',
      }),
      hidden: state.status !== 'loading',
    },
    {
      id: 'error',
      tone: 'error',
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
      hidden: state.status !== 'error',
    },
  ]
  const toolbarItems: WorkbenchToolbarItemConfig[] = [
    createWorkbenchResultVisibilityItem({
      t,
      defaultVisibleCount: MAX_VISIBLE_PETS,
      filteredCount: model.results.filteredPets.length,
      showAllResults: filters.showAllResults,
      canToggle: model.results.canToggleResultVisibility,
      isReady: state.status === 'ready',
      onClick: actions.toggleResultVisibility,
    }),
    createWorkbenchShuffleItem({
      t,
      resultCount: model.results.filteredPets.length,
      hasRandomOrder: ui.hasRandomOrder,
      isReady: state.status === 'ready',
      onClick: actions.randomizeResultOrder,
    }),
    createWorkbenchShareItem({
      state: ui.shareLinkState,
      onCopy: actions.copyCurrentLink,
    }),
  ]

  return (
    <FilterWorkbenchPage
      pageClassName="pets-page"
      storageKey="pets"
      ariaLabel={t({ zh: '宠物图鉴工作台', en: 'Pet workbench' })}
      shellClassName="workbench-page__shell pets-workbench"
      contentScrollRef={model.resultsPaneRef}
      contentOverlay={ui.showResultsQuickNavTop ? <WorkbenchFloatingTopButton onClick={actions.scrollResultsToTop} /> : null}
        toolbarLead={<WorkbenchToolbarFilterStatus label="PETS" activeCount={activeFilterCount} />}
      toolbarPrimary={
          <WorkbenchToolbarCopy
            kicker={t({ zh: '悬浮工作台', en: 'Floating workbench' })}
            title={t({ zh: '宠物图鉴', en: 'Pet catalog' })}
            detail={t({ zh: '宠物筛选与资源完整度排查', en: 'Filter pets and audit asset completeness' })}
          />
      }
        toolbarActions={<WorkbenchToolbarItems items={toolbarItems} layout="cluster" />}
      sidebarHeader={{
        kicker: t({ zh: '筛选抽屉', en: 'Filter drawer' }),
        title: t({ zh: '左侧缩小宠物目录', en: 'Narrow the pet catalog on the left' }),
        description: t({
          zh: '搜索负责关键词，来源和图像状态负责快速切分完整资源与待补条目；右侧保留更大的图鉴卡片比较区。',
          en: 'Search handles keywords, while source and asset state separate complete entries from missing-art rows.',
        }),
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
