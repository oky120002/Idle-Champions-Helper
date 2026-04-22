import { FilterWorkbenchShell } from '../components/filter-sidebar/FilterWorkbenchShell'
import { WorkbenchResultsFloatingTopButton } from '../components/filter-sidebar/WorkbenchResultsFloatingTopButton'
import { StatusBanner } from '../components/StatusBanner'
import { VariantsFilterBar } from './variants/VariantsFilterBar'
import { VariantsResultsSection } from './variants/VariantsResultsSection'
import { VariantsWorkbenchContentHeader } from './variants/VariantsWorkbenchContentHeader'
import { useVariantsPageModel } from './variants/useVariantsPageModel'

export function VariantsPage() {
  const model = useVariantsPageModel()
  const { state, t, activeFilters, clearAllFilters, showResultsQuickNavTop, scrollResultsToTop } = model

  return (
    <div className="page-stack variants-page variants-page--workbench">
      <FilterWorkbenchShell
        storageKey="variants"
        ariaLabel={t({ zh: '变体筛选工作台', en: 'Variant workbench' })}
        className="variants-workbench"
        contentScrollRef={model.resultsPaneRef}
        contentOverlay={showResultsQuickNavTop ? <WorkbenchResultsFloatingTopButton onClick={scrollResultsToTop} /> : null}
        toolbarLead={(
          <div className="variants-workbench__toolbar-mark" aria-hidden="true">
            <span className="variants-workbench__toolbar-mark-dot" />
            <span className="variants-workbench__toolbar-mark-label">VARIANTS</span>
          </div>
        )}
        toolbarPrimary={(
          <div className="variants-workbench__toolbar-copy">
            <span className="variants-workbench__toolbar-kicker">{t({ zh: '悬浮工作台', en: 'Floating workbench' })}</span>
            <strong className="variants-workbench__toolbar-title">{t({ zh: '变体筛选', en: 'Variant filters' })}</strong>
            <span className="variants-workbench__toolbar-detail">
              {t({ zh: '战役压力、敌人与阵型阅读台', en: 'Campaign pressure, enemy, and formation reading desk' })}
            </span>
          </div>
        )}
        toolbarActions={(
          <>
            <span className="filter-sidebar-panel__badge variants-workbench__toolbar-badge">
              {activeFilters.length > 0
                ? t({ zh: `${activeFilters.length} 项条件`, en: `${activeFilters.length} active` })
                : t({ zh: '条件待命', en: 'Filters idle' })}
            </span>
            {state.status === 'ready' ? (
              <span className="filter-sidebar-panel__badge variants-workbench__toolbar-badge variants-workbench__toolbar-badge--muted">
                {t({ zh: `${model.filteredVariants.length} 个命中`, en: `${model.filteredVariants.length} matches` })}
              </span>
            ) : null}
          </>
        )}
        sidebarHeader={(
          <div className="variants-workbench__sidebar-header">
            <div className="variants-workbench__sidebar-copy">
              <p className="variants-workbench__sidebar-kicker">{t({ zh: '筛选抽屉', en: 'Filter drawer' })}</p>
              <h3 className="variants-workbench__sidebar-title">{t({ zh: '左侧缩小压力范围', en: 'Narrow variant pressure on the left' })}</h3>
              <p className="variants-workbench__sidebar-description">
                {t({
                  zh: '先用战役、区域和场景缩小范围，再让敌人类型、攻击构成和特别敌人数辅助阵型判断。',
                  en: 'Narrow by campaign, area, and scene first, then use enemy tags, attack mix, and special-enemy density to support formation decisions.',
                })}
              </p>
            </div>

            <div className="variants-workbench__sidebar-status" role="group" aria-label={t({ zh: '变体筛选状态操作', en: 'Variant filter status actions' })}>
              <span className="filter-sidebar-panel__badge">
                {activeFilters.length > 0
                  ? t({ zh: `${activeFilters.length} 项已启用`, en: `${activeFilters.length} active` })
                  : t({ zh: '当前未启用条件', en: 'No active filters' })}
              </span>
              {activeFilters.length > 0 ? (
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
        sidebar={state.status === 'ready' ? <VariantsFilterBar model={model} /> : <div className="variants-workbench__sidebar-loading" aria-hidden="true" />}
        contentHeader={state.status === 'ready' ? <VariantsWorkbenchContentHeader model={model} /> : null}
      >
        {state.status === 'loading' ? (
          <StatusBanner tone="info">{t({ zh: '正在读取官方变体数据…', en: 'Loading official variant data…' })}</StatusBanner>
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '变体数据读取失败', en: 'Variant data failed to load' })}
            detail={state.message || t({ zh: '未知错误', en: 'Unknown error' })}
          />
        ) : null}

        {state.status === 'ready' ? <VariantsResultsSection model={model} /> : null}
      </FilterWorkbenchShell>
    </div>
  )
}
