import { FilterWorkbenchShell } from '../components/filter-sidebar/FilterWorkbenchShell'
import { StatusBanner } from '../components/StatusBanner'
import { ChampionsResultsSection } from './champions/ChampionsResultsSection'
import { ChampionsWorkbenchContentHeader } from './champions/ChampionsWorkbenchContentHeader'
import { ChampionsWorkbenchSidebar } from './champions/ChampionsWorkbenchSidebar'
import { useChampionsPageModel } from './champions/useChampionsPageModel'

export function ChampionsPage() {
  const model = useChampionsPageModel()
  const { filteredChampions, state, t, activeFilterChips, hasActiveFilters, clearAllFilters } = model
  const activeFilterCount = activeFilterChips.length

  return (
    <div className="page-stack champions-page champions-page--workbench">
      <FilterWorkbenchShell
        storageKey="champions"
        className="champions-workbench"
        contentScrollRef={model.resultsPaneRef}
        toolbarLead={(
          <div className="champions-workbench__toolbar-mark" aria-hidden="true">
            <span className="champions-workbench__toolbar-mark-dot" />
            <span className="champions-workbench__toolbar-mark-label">CHAMPIONS</span>
          </div>
        )}
        toolbarPrimary={(
          <div className="champions-workbench__toolbar-copy">
            <span className="champions-workbench__toolbar-kicker">{t({ zh: '悬浮工作台', en: 'Floating workbench' })}</span>
            <strong className="champions-workbench__toolbar-title">{t({ zh: '英雄筛选', en: 'Champion filters' })}</strong>
            <span className="champions-workbench__toolbar-detail">
              {t({ zh: '候选池收缩与资料对比', en: 'Narrow the roster and compare dossiers' })}
            </span>
          </div>
        )}
        toolbarActions={(
          <>
            <span className="filter-sidebar-toolbar__badge champions-workbench__toolbar-badge">
              {activeFilterCount > 0
                ? t({ zh: `${activeFilterCount} 项条件`, en: `${activeFilterCount} active` })
                : t({ zh: '条件待命', en: 'Filters idle' })}
            </span>
            {state.status === 'ready' ? (
              <span className="filter-sidebar-toolbar__badge champions-workbench__toolbar-badge champions-workbench__toolbar-badge--muted">
                {t({ zh: `${filteredChampions.length} 名命中`, en: `${filteredChampions.length} matches` })}
              </span>
            ) : null}
          </>
        )}
        sidebarHeader={(
          <div className="champions-workbench__sidebar-header">
            <div className="champions-workbench__sidebar-copy">
              <p className="champions-workbench__sidebar-kicker">{t({ zh: '筛选抽屉', en: 'Filter drawer' })}</p>
              <h3 className="champions-workbench__sidebar-title">{t({ zh: '左侧缩小候选池', en: 'Narrow the roster on the left' })}</h3>
              <p className="champions-workbench__sidebar-description">
                {t({
                  zh: '先锁关键词、座位、定位和联动队伍，再按需展开身份画像与特殊机制，不要一开始就把所有低频条件摊开。',
                  en: 'Lock keyword, seat, role, and affiliation first, then expand identity and mechanics only when you need the lower-frequency filters.',
                })}
              </p>
            </div>

            <div
              className="champions-workbench__sidebar-status"
              role="group"
              aria-label={t({ zh: '筛选状态操作', en: 'Filter status actions' })}
            >
              <span className="filter-sidebar-panel__badge">
                {activeFilterCount > 0
                  ? t({ zh: `${activeFilterCount} 项已启用`, en: `${activeFilterCount} active` })
                  : t({ zh: '当前未启用条件', en: 'No active filters' })}
              </span>
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="action-button action-button--secondary action-button--compact"
                  onClick={clearAllFilters}
                >
                  {t({ zh: '清空全部', en: 'Clear all' })}
                </button>
              ) : null}
            </div>
          </div>
        )}
        sidebar={state.status === 'ready' ? <ChampionsWorkbenchSidebar model={model} /> : <ChampionsWorkbenchSidebarLoading />}
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
      </FilterWorkbenchShell>
    </div>
  )
}

function ChampionsWorkbenchSidebarLoading() {
  return <div className="champions-workbench__sidebar-loading" aria-hidden="true" />
}
