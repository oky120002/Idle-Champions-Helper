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
      title: t("正在加载立绘目录"),
      detail: t("正在读取本地版本化立绘清单与英雄筛选元数据。"),
    },
    error: {
      title: t("立绘目录加载失败"),
      ...(state.status === 'error'
        ? {
            detail: state.message !== ''
              ? t("无法读取立绘目录数据：{p0}", { p0: state.message })
              : t("无法读取立绘目录数据。"),
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
      ariaLabel={t("立绘图鉴工作台")}
      shellClassName="workbench-page__shell illustrations-workbench"
      contentScrollRef={model.resultsPaneRef}
      floatingTopButton={ui.showResultsQuickNavTop ? { onClick: actions.scrollResultsToTop } : undefined}
      toolbar={{
        sections: [
          {
            region: 'lead',
            section: {
              kind: 'filter-status',
              label: 'ART CODEX',
              activeCount: activeFilterChips.length,
            },
          },
          {
            region: 'primary',
            section: {
              kind: 'copy',
              title: t("立绘图鉴"),
              detail: t("立绘筛选与动态资源对照"),
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
        statusLabel: t("立绘筛选状态操作"),
        activeCount: activeFilterChips.length,
        clearLabel: t("清空全部"),
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
