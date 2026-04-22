import { PageWorkbenchShell } from '../components/workbench/PageWorkbenchShell'
import {
  WorkbenchShareButton,
  WorkbenchSidebarHeader,
  WorkbenchSidebarLoading,
  WorkbenchToolbarBadge,
  WorkbenchToolbarCopy,
  WorkbenchToolbarMark,
} from '../components/workbench/WorkbenchScaffold'
import { WorkbenchFloatingTopButton } from '../components/workbench/WorkbenchFloatingTopButton'
import { StatusBanner } from '../components/StatusBanner'
import { ChampionsAdditionalFilters } from './champions/ChampionsAdditionalFilters'
import { ChampionsPrimaryFilters } from './champions/ChampionsPrimaryFilters'
import { ChampionsResultsSection } from './champions/ChampionsResultsSection'
import { ChampionsWorkbenchContentHeader } from './champions/ChampionsWorkbenchContentHeader'
import { useChampionsPageModel } from './champions/useChampionsPageModel'

export function ChampionsPage() {
  const model = useChampionsPageModel()
  const { filteredChampions, state, t, activeFilterChips, hasActiveFilters, clearAllFilters } = model
  const activeFilterCount = activeFilterChips.length

  return (
    <div className="champions-page workbench-page">
      <PageWorkbenchShell
        storageKey="champions"
        ariaLabel={t({ zh: '英雄筛选工作台', en: 'Champion filter workbench' })}
        className="workbench-page__shell champions-workbench"
        contentScrollRef={model.resultsPaneRef}
        contentOverlay={(
          model.showResultsQuickNavTop ? (
            <WorkbenchFloatingTopButton onClick={model.scrollResultsToTop} />
          ) : null
        )}
        toolbarLead={<WorkbenchToolbarMark label="CHAMPIONS" />}
        toolbarPrimary={(
          <WorkbenchToolbarCopy
            kicker={t({ zh: '悬浮工作台', en: 'Floating workbench' })}
            title={t({ zh: '英雄筛选', en: 'Champion filters' })}
            detail={t({ zh: '候选池收缩与资料对比', en: 'Narrow the roster and compare dossiers' })}
          />
        )}
        toolbarActions={(
          <>
            <WorkbenchToolbarBadge variant="filter">
              {activeFilterCount > 0
                ? t({ zh: `${activeFilterCount} 项条件`, en: `${activeFilterCount} active` })
                : t({ zh: '条件待命', en: 'Filters idle' })}
            </WorkbenchToolbarBadge>
            {state.status === 'ready' ? (
              <WorkbenchToolbarBadge variant="filter" tone="muted">
                {t({ zh: `${filteredChampions.length} 命中`, en: `${filteredChampions.length} matches` })}
              </WorkbenchToolbarBadge>
            ) : null}
            <WorkbenchShareButton state={model.shareLinkState} onCopy={model.copyCurrentLink} />
          </>
        )}
        sidebarHeader={(
          <WorkbenchSidebarHeader
            kicker={t({ zh: '筛选抽屉', en: 'Filter drawer' })}
            title={t({ zh: '左侧缩小候选池', en: 'Narrow the roster on the left' })}
            description={t({
              zh: '先锁关键词、座位、定位和联动队伍，再按需展开身份画像与特殊机制，不要一开始就把所有低频条件摊开。',
              en: 'Lock keyword, seat, role, and affiliation first, then expand identity and mechanics only when you need the lower-frequency filters.',
            })}
            statusLabel={t({ zh: '筛选状态操作', en: 'Filter status actions' })}
            status={(
              <>
                <WorkbenchToolbarBadge variant="filter">
                  {activeFilterCount > 0
                    ? t({ zh: `${activeFilterCount} 项已启用`, en: `${activeFilterCount} active` })
                    : t({ zh: '当前未启用条件', en: 'No active filters' })}
                </WorkbenchToolbarBadge>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className="action-button action-button--secondary action-button--compact"
                    onClick={clearAllFilters}
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
                <ChampionsPrimaryFilters model={model} />
                <ChampionsAdditionalFilters model={model} />
              </div>
            )
          : <WorkbenchSidebarLoading />}
        contentHeader={state.status === 'ready' ? <ChampionsWorkbenchContentHeader model={model} /> : null}
      >
        {state.status === 'loading' ? (
          <StatusBanner tone="info">{t({ zh: '正在读取英雄数据…', en: 'Loading champion data…' })}</StatusBanner>
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '英雄数据读取失败', en: 'Champion data failed to load' })}
            detail={state.message || t({ zh: '未知错误', en: 'Unknown error' })}
          />
        ) : null}

        {state.status === 'ready' ? <ChampionsResultsSection model={model} /> : null}
      </PageWorkbenchShell>
    </div>
  )
}
