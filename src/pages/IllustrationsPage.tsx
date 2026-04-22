import { FilterWorkbenchShell } from '../components/filter-sidebar/FilterWorkbenchShell'
import { WorkbenchResultsFloatingTopButton } from '../components/filter-sidebar/WorkbenchResultsFloatingTopButton'
import { StatusBanner } from '../components/StatusBanner'
import { IllustrationsResultsSection } from './illustrations/IllustrationsResultsSection'
import { IllustrationsSidebar } from './illustrations/IllustrationsSidebar'
import { IllustrationsWorkbenchContentHeader } from './illustrations/IllustrationsWorkbenchContentHeader'
import { useIllustrationsPageModel } from './illustrations/useIllustrationsPageModel'

export function IllustrationsPage() {
  const model = useIllustrationsPageModel()
  const { state, t, activeFilterChips, hasActiveFilters, ui, actions } = model

  return (
    <div className="page-stack illustrations-page illustrations-page--workbench">
      <FilterWorkbenchShell
        storageKey="illustrations"
        ariaLabel={t({ zh: '立绘图鉴工作台', en: 'Illustration workbench' })}
        className="illustrations-workbench"
        contentScrollRef={model.resultsPaneRef}
        contentOverlay={(
          ui.showResultsQuickNavTop ? <WorkbenchResultsFloatingTopButton onClick={actions.scrollResultsToTop} /> : null
        )}
        toolbarLead={(
          <div className="illustrations-workbench__toolbar-mark" aria-hidden="true">
            <span className="illustrations-workbench__toolbar-mark-dot" />
            <span className="illustrations-workbench__toolbar-mark-label">ART CODEX</span>
          </div>
        )}
        toolbarPrimary={(
          <div className="illustrations-workbench__toolbar-copy">
            <span className="illustrations-workbench__toolbar-kicker">{t({ zh: '悬浮工作台', en: 'Floating workbench' })}</span>
            <strong className="illustrations-workbench__toolbar-title">{t({ zh: '立绘图鉴', en: 'Illustration catalog' })}</strong>
            <span className="illustrations-workbench__toolbar-detail">
              {t({ zh: '立绘筛选与动态资源对照', en: 'Filter artwork and compare motion resources' })}
            </span>
          </div>
        )}
        toolbarActions={(
          <>
            <span className="filter-sidebar-panel__badge illustrations-workbench__toolbar-badge">
              {activeFilterChips.length > 0
                ? t({ zh: `${activeFilterChips.length} 项条件`, en: `${activeFilterChips.length} active` })
                : t({ zh: '条件待命', en: 'Filters idle' })}
            </span>
            {state.status === 'ready' ? (
              <span className="filter-sidebar-panel__badge illustrations-workbench__toolbar-badge illustrations-workbench__toolbar-badge--muted">
                {t({ zh: `${model.results.filteredIllustrationEntries.length} 张命中`, en: `${model.results.filteredIllustrationEntries.length} matches` })}
              </span>
            ) : null}
          </>
        )}
        sidebarHeader={(
          <div className="illustrations-workbench__sidebar-header">
            <div className="illustrations-workbench__sidebar-copy">
              <p className="illustrations-workbench__sidebar-kicker">{t({ zh: '筛选抽屉', en: 'Filter drawer' })}</p>
              <h3 className="illustrations-workbench__sidebar-title">{t({ zh: '左侧缩小画库范围', en: 'Narrow the art library on the left' })}</h3>
              <p className="illustrations-workbench__sidebar-description">
                {t({
                  zh: '先锁范围、座位、定位和联动队伍，再按需展开身份和机制标签；右侧保留更大的画布给预览卡片与动图资源。',
                  en: 'Lock scope, seat, role, and affiliations first, then expand identity and mechanic tags only when you need them.',
                })}
              </p>
            </div>

            <div className="illustrations-workbench__sidebar-status" role="group" aria-label={t({ zh: '立绘筛选状态操作', en: 'Illustration filter status actions' })}>
              <span className="filter-sidebar-panel__badge">
                {activeFilterChips.length > 0
                  ? t({ zh: `${activeFilterChips.length} 项已启用`, en: `${activeFilterChips.length} active` })
                  : t({ zh: '当前未启用条件', en: 'No active filters' })}
              </span>
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="action-button action-button--secondary action-button--compact"
                  onClick={actions.clearAllFilters}
                >
                  {t({ zh: '清空全部', en: 'Clear all' })}
                </button>
              ) : null}
            </div>
          </div>
        )}
        sidebar={state.status === 'ready' ? <IllustrationsSidebar model={model} /> : <div className="illustrations-workbench__sidebar-loading" aria-hidden="true" />}
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
      </FilterWorkbenchShell>
    </div>
  )
}
