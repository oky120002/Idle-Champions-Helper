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
import { VariantsFilterBar } from './variants/VariantsFilterBar'
import { VariantsResultsSection } from './variants/VariantsResultsSection'
import { VariantsWorkbenchContentHeader } from './variants/VariantsWorkbenchContentHeader'
import { useVariantsPageModel } from './variants/useVariantsPageModel'

export function VariantsPage() {
  const model = useVariantsPageModel()
  const { state, t, activeFilters, clearAllFilters, showResultsQuickNavTop, scrollResultsToTop } = model

  return (
    <div className="variants-page workbench-page">
      <PageWorkbenchShell
        storageKey="variants"
        ariaLabel={t({ zh: '变体筛选工作台', en: 'Variant workbench' })}
        className="workbench-page__shell variants-workbench"
        contentScrollRef={model.resultsPaneRef}
        contentOverlay={showResultsQuickNavTop ? <WorkbenchFloatingTopButton onClick={scrollResultsToTop} /> : null}
        toolbarLead={<WorkbenchToolbarMark label="VARIANTS" accentTone="steel" />}
        toolbarPrimary={(
          <WorkbenchToolbarCopy
            kicker={t({ zh: '悬浮工作台', en: 'Floating workbench' })}
            title={t({ zh: '变体筛选', en: 'Variant filters' })}
            detail={t({ zh: '战役压力、敌人与阵型阅读台', en: 'Campaign pressure, enemy, and formation reading desk' })}
          />
        )}
        toolbarActions={(
          <>
            <WorkbenchToolbarBadge variant="filter">
              {activeFilters.length > 0
                ? t({ zh: `${activeFilters.length} 项条件`, en: `${activeFilters.length} active` })
                : t({ zh: '条件待命', en: 'Filters idle' })}
            </WorkbenchToolbarBadge>
            {state.status === 'ready' ? (
              <WorkbenchToolbarBadge variant="filter" tone="muted">
                {t({ zh: `${model.filteredVariants.length} 个命中`, en: `${model.filteredVariants.length} matches` })}
              </WorkbenchToolbarBadge>
            ) : null}
            <WorkbenchShareButton state={model.shareLinkState} onCopy={model.copyCurrentLink} />
          </>
        )}
        sidebarHeader={(
          <WorkbenchSidebarHeader
            kicker={t({ zh: '筛选抽屉', en: 'Filter drawer' })}
            title={t({ zh: '左侧缩小压力范围', en: 'Narrow variant pressure on the left' })}
            description={t({
              zh: '先用战役、区域和场景缩小范围，再让敌人类型、攻击构成和特别敌人数辅助阵型判断。',
              en: 'Narrow by campaign, area, and scene first, then use enemy tags, attack mix, and special-enemy density to support formation decisions.',
            })}
            statusLabel={t({ zh: '变体筛选状态操作', en: 'Variant filter status actions' })}
            status={(
              <>
                <WorkbenchToolbarBadge variant="filter">
                {activeFilters.length > 0
                  ? t({ zh: `${activeFilters.length} 项已启用`, en: `${activeFilters.length} active` })
                  : t({ zh: '当前未启用条件', en: 'No active filters' })}
                </WorkbenchToolbarBadge>
                {activeFilters.length > 0 ? (
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
        sidebar={state.status === 'ready' ? <VariantsFilterBar model={model} /> : <WorkbenchSidebarLoading />}
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
      </PageWorkbenchShell>
    </div>
  )
}
