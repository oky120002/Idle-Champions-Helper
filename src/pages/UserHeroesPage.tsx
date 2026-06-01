import { FilterWorkbenchPage } from '../components/workbench/FilterWorkbenchPage'
import {
  createWorkbenchBadgeItem,
  createWorkbenchShareItem,
} from '../components/workbench/WorkbenchToolbarItemBuilders'
import { createAsyncStatusBannerItems } from '../components/statusBannerStackItemBuilders'
import { ChampionsAdditionalFilters } from './champions/ChampionsAdditionalFilters'
import { ChampionsPrimaryFilters } from './champions/ChampionsPrimaryFilters'
import { UserHeroesResultsSection } from './user-heroes/UserHeroesResultsSection'
import { UserHeroesWorkbenchContentHeader } from './user-heroes/UserHeroesWorkbenchContentHeader'
import { useUserHeroesPageModel } from './user-heroes/useUserHeroesPageModel'

export function UserHeroesPage() {
  const model = useUserHeroesPageModel()
  const {
    filteredChampions,
    state,
    t,
    activeFilterChips,
    hasActiveFilters,
    clearAllFilters,
  } = model
  const activeFilterCount = activeFilterChips.length
  const contentStatusItems = createAsyncStatusBannerItems({
    status: state.status,
    loading: {
      children: t({ zh: '正在读取英雄数据…', en: 'Loading champion data…' }),
    },
    error: {
      title: t({ zh: '用户英雄页读取失败', en: 'User heroes page failed to load' }),
      ...(state.status === 'error'
        ? { detail: state.message || t({ zh: '未知错误', en: 'Unknown error' }) }
        : {}),
    },
  })
  const toolbarItems = [
    createWorkbenchBadgeItem({
      id: 'user-hero-match-count',
      label: t({ zh: `${filteredChampions.length} 个命中`, en: `${filteredChampions.length} matches` }),
      tone: 'muted',
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
      pageClassName="user-heroes-page"
      storageKey="user-heroes"
      ariaLabel={t({ zh: '用户英雄工作台', en: 'User heroes workbench' })}
      shellClassName="workbench-page__shell user-heroes-workbench"
      contentScrollRef={model.resultsPaneRef}
      floatingTopButton={model.showResultsQuickNavTop ? { onClick: model.scrollResultsToTop } : undefined}
      toolbar={{
        sections: [
          {
            region: 'lead',
            section: {
              kind: 'filter-status',
              label: 'USER HEROES',
              activeCount: activeFilterCount,
            },
          },
          {
            region: 'primary',
            section: {
              kind: 'copy',
              title: t({ zh: '用户英雄', en: 'User heroes' }),
              detail: t({ zh: '按账号拥有态、装备进度与筛选条件阅读完整英雄矩阵', en: 'Read the full roster through ownership, equipment progress, and filters' }),
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
        kicker: t({ zh: '筛选抽屉', en: 'Filter drawer' }),
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
      contentHeader={<UserHeroesWorkbenchContentHeader model={model} />}
      statusItems={contentStatusItems}
    >
      <UserHeroesResultsSection model={model} />
    </FilterWorkbenchPage>
  )
}
