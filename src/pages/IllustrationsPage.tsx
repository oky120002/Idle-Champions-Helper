import { FilterWorkbenchPage } from '../components/workbench/FilterWorkbenchPage'
import {
  createWorkbenchFilterToolbarItems,
} from '../components/workbench/WorkbenchToolbarItemBuilders'
import { createAsyncStatusBannerItems } from '../components/statusBannerStackItemBuilders'
import { IllustrationsAdditionalFilters } from './illustrations/IllustrationsAdditionalFilters'
import { MAX_VISIBLE_ILLUSTRATIONS } from './illustrations/constants'
import { IllustrationsPrimaryFilters } from './illustrations/IllustrationsPrimaryFilters'
import { IllustrationsResultsSection } from './illustrations/IllustrationsResultsSection'
import { IllustrationsWorkbenchContentHeader } from './illustrations/IllustrationsWorkbenchContentHeader'
import { useIllustrationsPageModel } from './illustrations/useIllustrationsPageModel'

export function IllustrationsPage() {
  const model = useIllustrationsPageModel()
  const { state, t, activeFilterChips, hasActiveFilters, ui, actions } = model
  const contentStatusItems = createAsyncStatusBannerItems({
    status: state.status,
    loading: {
      title: t({ zh: '正在加载立绘目录', en: 'Loading illustration catalog' }),
      detail: t({
        zh: '正在读取本地版本化立绘清单与英雄筛选元数据。',
        en: 'Reading the local illustration manifest and champion filter metadata.',
      }),
    },
    error: {
      title: t({ zh: '立绘目录加载失败', en: 'Failed to load illustration catalog' }),
      ...(state.status === 'error'
        ? {
            detail: state.message
              ? t({
                  zh: `无法读取立绘目录数据：${state.message}`,
                  en: `Unable to read illustration catalog data: ${state.message}`,
                })
              : t({
                  zh: '无法读取立绘目录数据。',
                  en: 'Unable to read illustration catalog data.',
                }),
          }
        : {}),
    },
  })
  const toolbarItems = createWorkbenchFilterToolbarItems({
    t,
    defaultVisibleCount: MAX_VISIBLE_ILLUSTRATIONS,
    filteredCount: model.results.filteredIllustrationEntries.length,
    showAllResults: model.filters.showAllResults,
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
      pageClassName="illustrations-page"
      storageKey="illustrations"
      ariaLabel={t({ zh: '立绘图鉴工作台', en: 'Illustration workbench' })}
      shellClassName="workbench-page__shell illustrations-workbench"
      contentScrollRef={model.resultsPaneRef}
      floatingTopButton={ui.showResultsQuickNavTop ? { onClick: actions.scrollResultsToTop } : undefined}
      toolbar={{
        lead: {
          kind: 'filter-status',
          label: 'ART CODEX',
          activeCount: activeFilterChips.length,
        },
        primary: {
          kind: 'copy',
          title: t({ zh: '立绘图鉴', en: 'Illustration catalog' }),
          detail: t({ zh: '立绘筛选与动态资源对照', en: 'Filter artwork and compare motion resources' }),
        },
        actions: {
          kind: 'items',
          items: toolbarItems,
          layout: 'cluster',
        },
      }}
      sidebarHeader={{
        kicker: t({ zh: '筛选抽屉', en: 'Filter drawer' }),
        statusLabel: t({ zh: '立绘筛选状态操作', en: 'Illustration filter status actions' }),
        activeCount: activeFilterChips.length,
        clearLabel: t({ zh: '清空全部', en: 'Clear all' }),
        ...(hasActiveFilters ? { onClear: actions.clearAllFilters } : {}),
      }}
      isReady={state.status === 'ready'}
      sidebar={(
        <div className="workbench-page__sidebar-stack">
          <IllustrationsPrimaryFilters model={model} />
          <IllustrationsAdditionalFilters model={model} />
        </div>
      )}
      contentHeader={<IllustrationsWorkbenchContentHeader model={model} />}
      statusItems={contentStatusItems}
    >
      <IllustrationsResultsSection model={model} />
    </FilterWorkbenchPage>
  )
}
