import { PageWorkbenchShell } from '../components/workbench/PageWorkbenchShell'
import {
  WorkbenchSidebarFilterStatus,
  WorkbenchSidebarHeader,
  WorkbenchSidebarLoading,
  WorkbenchToolbarCopy,
  WorkbenchToolbarFilterStatus,
} from '../components/workbench/WorkbenchScaffold'
import {
  WorkbenchToolbarItems,
  type WorkbenchToolbarItemConfig,
} from '../components/workbench/WorkbenchToolbarItems'
import { WorkbenchFloatingTopButton } from '../components/workbench/WorkbenchFloatingTopButton'
import { StatusBanner } from '../components/StatusBanner'
import { IllustrationsAdditionalFilters } from './illustrations/IllustrationsAdditionalFilters'
import { MAX_VISIBLE_ILLUSTRATIONS } from './illustrations/constants'
import { IllustrationsPrimaryFilters } from './illustrations/IllustrationsPrimaryFilters'
import { IllustrationsResultsSection } from './illustrations/IllustrationsResultsSection'
import { IllustrationsWorkbenchContentHeader } from './illustrations/IllustrationsWorkbenchContentHeader'
import { useIllustrationsPageModel } from './illustrations/useIllustrationsPageModel'

export function IllustrationsPage() {
  const model = useIllustrationsPageModel()
  const { state, t, activeFilterChips, hasActiveFilters, ui, actions } = model
  const resultVisibilityLabel = model.results.canToggleResultVisibility
    ? model.filters.showAllResults
      ? t({ zh: `收起到默认 ${MAX_VISIBLE_ILLUSTRATIONS}`, en: `Collapse to default ${MAX_VISIBLE_ILLUSTRATIONS}` })
      : t({
          zh: `显示全部 ${model.results.filteredIllustrationEntries.length}（默认 ${MAX_VISIBLE_ILLUSTRATIONS}）`,
          en: `Show all ${model.results.filteredIllustrationEntries.length} (default ${MAX_VISIBLE_ILLUSTRATIONS})`,
        })
    : null
  const randomOrderLabel = ui.hasRandomOrder
    ? t({ zh: '重新随机', en: 'Reshuffle' })
    : t({ zh: '随机排序', en: 'Shuffle order' })
  const toolbarItems: WorkbenchToolbarItemConfig[] = [
    {
      id: 'toggle-visibility',
      label: resultVisibilityLabel ?? '',
      onClick: actions.toggleResultVisibility,
      isActive: model.filters.showAllResults,
      ariaPressed: model.filters.showAllResults,
      variant: 'prominent',
      hidden: state.status !== 'ready' || resultVisibilityLabel == null,
    },
    {
      id: 'shuffle-results',
      label: randomOrderLabel,
      onClick: actions.randomizeResultOrder,
      isActive: ui.hasRandomOrder,
      hidden: state.status !== 'ready' || model.results.filteredIllustrationEntries.length <= 1,
    },
    {
      id: 'share-link',
      kind: 'share',
      state: ui.shareLinkState,
      onCopy: actions.copyCurrentLink,
    },
  ]

  return (
    <div className="illustrations-page workbench-page">
      <PageWorkbenchShell
        storageKey="illustrations"
        ariaLabel={t({ zh: '立绘图鉴工作台', en: 'Illustration workbench' })}
        className="workbench-page__shell illustrations-workbench"
        contentScrollRef={model.resultsPaneRef}
        contentOverlay={(
          ui.showResultsQuickNavTop ? <WorkbenchFloatingTopButton onClick={actions.scrollResultsToTop} /> : null
        )}
        toolbarLead={<WorkbenchToolbarFilterStatus label="ART CODEX" activeCount={activeFilterChips.length} />}
        toolbarPrimary={(
          <WorkbenchToolbarCopy
            kicker={t({ zh: '悬浮工作台', en: 'Floating workbench' })}
            title={t({ zh: '立绘图鉴', en: 'Illustration catalog' })}
            detail={t({ zh: '立绘筛选与动态资源对照', en: 'Filter artwork and compare motion resources' })}
          />
        )}
        toolbarActions={<WorkbenchToolbarItems items={toolbarItems} layout="cluster" />}
        sidebarHeader={(
          <WorkbenchSidebarHeader
            kicker={t({ zh: '筛选抽屉', en: 'Filter drawer' })}
            title={t({ zh: '左侧缩小画库范围', en: 'Narrow the art library on the left' })}
            description={t({
              zh: '先锁范围、座位、定位和联动队伍，再按需展开身份和机制标签；右侧保留更大的画布给预览卡片与动图资源。',
              en: 'Lock scope, seat, role, and affiliations first, then expand identity and mechanic tags only when you need them.',
            })}
            statusLabel={t({ zh: '立绘筛选状态操作', en: 'Illustration filter status actions' })}
            status={(
              <>
                <WorkbenchSidebarFilterStatus activeCount={activeFilterChips.length} />
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className="action-button action-button--secondary action-button--compact"
                    onClick={actions.clearAllFilters}
                  >
                    {t({ zh: '清空全部', en: 'Clear all' })}
                  </button>
                ) : null}
              </>
            )}
          />
        )}
        sidebar={state.status === 'ready'
          ? (
              <div className="workbench-page__sidebar-stack">
                <IllustrationsPrimaryFilters model={model} />
                <IllustrationsAdditionalFilters model={model} />
              </div>
            )
          : <WorkbenchSidebarLoading />}
        contentHeader={state.status === 'ready' ? <IllustrationsWorkbenchContentHeader model={model} /> : null}
      >
        {state.status === 'loading' ? (
          <StatusBanner
            tone="info"
            title={t({ zh: '正在加载立绘目录', en: 'Loading illustration catalog' })}
            detail={t({
              zh: '正在读取本地版本化立绘清单与英雄筛选元数据。',
              en: 'Reading the local illustration manifest and champion filter metadata.',
            })}
          />
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '立绘目录加载失败', en: 'Failed to load illustration catalog' })}
            detail={
              state.message
                ? t({
                    zh: `无法读取立绘目录数据：${state.message}`,
                    en: `Unable to read illustration catalog data: ${state.message}`,
                  })
                : t({
                    zh: '无法读取立绘目录数据。',
                    en: 'Unable to read illustration catalog data.',
                  })
            }
          />
        ) : null}

        {state.status === 'ready' ? <IllustrationsResultsSection model={model} /> : null}
      </PageWorkbenchShell>
    </div>
  )
}
