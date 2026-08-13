import { Link } from 'react-router-dom'
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
      children: t("正在读取英雄数据…"),
    },
    error: {
      title: t("英雄数据读取失败"),
      ...(state.status === 'error'
        ? { detail: state.message !== '' ? state.message : t("未知错误") }
        : {}),
    },
  })
  const toolbarItems = createWorkbenchFilterToolbarItems({
    t,
    showAllResults,
    defaultVisibleCount: MAX_VISIBLE_RESULTS,
    filteredCount: filteredChampions.length,
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
      ariaLabel={t("英雄筛选工作台")}
      shellClassName="workbench-page__shell champions-workbench"
      contentScrollRef={model.resultsPaneRef}
      floatingTopButton={model.showResultsQuickNavTop ? { onClick: model.scrollResultsToTop } : undefined}
      toolbar={{
        sections: [
          {
            region: 'lead',
            section: {
              kind: 'filter-status',
              label: 'CHAMPIONS',
              activeCount: activeFilterCount,
            },
          },
          {
            region: 'primary',
            section: {
              kind: 'copy',
              title: t("英雄筛选"),
              detail: t("候选池收缩与资料对比"),
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
        statusLabel: t("筛选状态操作"),
        activeCount: activeFilterCount,
        clearLabel: t("清空全部"),
        ...(hasActiveFilters ? { onClear: clearAllFilters } : {}),
      }}
      isReady={state.status === 'ready'}
      sidebar={(
        <div className="workbench-page__sidebar-stack">
          <ChampionsPrimaryFilters model={model} />
          <ChampionsAdditionalFilters model={model} />
          {model.formationWithFiltersHref !== null ? (
            <Link className="action-button action-button--secondary formation-filter-link" to={model.formationWithFiltersHref}>
              {t("带着当前筛选去摆阵型")}
            </Link>
          ) : null}
        </div>
      )}
      contentHeader={<ChampionsWorkbenchContentHeader model={model} />}
      statusItems={contentStatusItems}
    >
      <ChampionsResultsSection model={model} />
    </FilterWorkbenchPage>
  )
}
