import { FilterWorkbenchPage } from '../components/workbench/FilterWorkbenchPage'
import {
  createWorkbenchFilterToolbarItems,
} from '../components/workbench/WorkbenchToolbarItemBuilders'
import { createAsyncStatusBannerItems } from '../components/statusBannerStackItemBuilders'
import { ChampionsAdditionalFilters } from './champions/ChampionsAdditionalFilters'
import { ChampionsPrimaryFilters } from './champions/ChampionsPrimaryFilters'
import { ChampionsResultsSection } from './champions/ChampionsResultsSection'
import { ChampionsWorkbenchContentHeader } from './champions/ChampionsWorkbenchContentHeader'
import { MAX_VISIBLE_RESULTS } from './champions/constants'
import { useChampionsPageModel } from './champions/useChampionsPageModel'

export function ChampionsPage() {
  const model = useChampionsPageModel()
  const {
    filteredChampions,
    state,
    t,
    activeFilterChips,
    hasActiveFilters,
    clearAllFilters,
    canToggleResultVisibility,
    showAllResults,
    toggleResultVisibility,
    hasRandomOrder,
    randomizeResultOrder,
  } = model
  const activeFilterCount = activeFilterChips.length
  const contentStatusItems = createAsyncStatusBannerItems({
    status: state.status,
    loading: {
      children: t({ zh: '正在读取英雄数据…', en: 'Loading champion data…' }),
    },
    error: {
      title: t({ zh: '英雄数据读取失败', en: 'Champion data failed to load' }),
      ...(state.status === 'error'
        ? { detail: state.message || t({ zh: '未知错误', en: 'Unknown error' }) }
        : {}),
    },
  })
  const toolbarItems = createWorkbenchFilterToolbarItems({
    t,
    defaultVisibleCount: MAX_VISIBLE_RESULTS,
    filteredCount: filteredChampions.length,
    showAllResults,
    canToggle: canToggleResultVisibility,
    isReady: state.status === 'ready',
    onToggleVisibility: toggleResultVisibility,
    shareState: model.shareLinkState,
    onCopy: model.copyCurrentLink,
    shuffle: {
      hasRandomOrder,
      onShuffle: randomizeResultOrder,
    },
  })

  return (
    <FilterWorkbenchPage
      pageClassName="champions-page"
      storageKey="champions"
      ariaLabel={t({ zh: '英雄筛选工作台', en: 'Champion filter workbench' })}
      shellClassName="workbench-page__shell champions-workbench"
      contentScrollRef={model.resultsPaneRef}
      floatingTopButton={model.showResultsQuickNavTop ? { onClick: model.scrollResultsToTop } : undefined}
      toolbarIntro={{
        label: 'CHAMPIONS',
        activeCount: activeFilterCount,
        title: t({ zh: '英雄筛选', en: 'Champion filters' }),
        detail: t({ zh: '候选池收缩与资料对比', en: 'Narrow the roster and compare dossiers' }),
      }}
      toolbarItems={toolbarItems}
      sidebarHeader={{
        kicker: t({ zh: '筛选抽屉', en: 'Filter drawer' }),
        title: t({ zh: '左侧缩小候选池', en: 'Narrow the roster on the left' }),
        description: t({
          zh: '先锁关键词、座位、定位和联动队伍，再按需展开身份画像与特殊机制，不要一开始就把所有低频条件摊开。',
          en: 'Lock keyword, seat, role, and affiliation first, then expand identity and mechanics only when you need the lower-frequency filters.',
        }),
        statusLabel: t({ zh: '筛选状态操作', en: 'Filter status actions' }),
        activeCount: activeFilterCount,
        clearLabel: t({ zh: '清空全部', en: 'Clear all' }),
        ...(hasActiveFilters ? { onClear: clearAllFilters } : {}),
      }}
      isReady={state.status === 'ready'}
      sidebar={(
        <div className="workbench-page__sidebar-stack">
          <ChampionsPrimaryFilters model={model} />
          <ChampionsAdditionalFilters model={model} />
        </div>
      )}
      contentHeader={<ChampionsWorkbenchContentHeader model={model} />}
      statusItems={contentStatusItems}
    >
      <ChampionsResultsSection model={model} />
    </FilterWorkbenchPage>
  )
}
