import { PageWorkbenchShell } from '../components/workbench/PageWorkbenchShell'
import {
  WorkbenchSidebarHeader,
  WorkbenchSidebarLoading,
  WorkbenchToolbarCopy,
  WorkbenchToolbarFilterStatus,
} from '../components/workbench/WorkbenchScaffold'
import {
  createWorkbenchResultVisibilityItem,
  createWorkbenchShareItem,
} from '../components/workbench/WorkbenchToolbarItemBuilders'
import { WorkbenchSidebarFilterActions } from '../components/workbench/WorkbenchSidebarFilterActions'
import {
  WorkbenchToolbarItems,
  type WorkbenchToolbarItemConfig,
} from '../components/workbench/WorkbenchToolbarItems'
import { WorkbenchFloatingTopButton } from '../components/workbench/WorkbenchFloatingTopButton'
import { StatusBanner } from '../components/StatusBanner'
import { MAX_VISIBLE_VARIANTS } from './variants/constants'
import { VariantsFilterBar } from './variants/VariantsFilterBar'
import { VariantsResultsSection } from './variants/VariantsResultsSection'
import { VariantsWorkbenchContentHeader } from './variants/VariantsWorkbenchContentHeader'
import { useVariantsPageModel } from './variants/useVariantsPageModel'

export function VariantsPage() {
  const model = useVariantsPageModel()
  const { state, t, activeFilters, clearAllFilters, showResultsQuickNavTop, scrollResultsToTop } = model
  const toolbarItems: WorkbenchToolbarItemConfig[] = [
    createWorkbenchResultVisibilityItem({
      t,
      defaultVisibleCount: MAX_VISIBLE_VARIANTS,
      filteredCount: model.filteredVariants.length,
      showAllResults: model.filters.showAllResults,
      canToggle: model.canToggleResultVisibility,
      isReady: state.status === 'ready',
      onClick: model.toggleResultVisibility,
    }),
    createWorkbenchShareItem({
      state: model.shareLinkState,
      onCopy: model.copyCurrentLink,
    }),
  ]

  return (
    <div className="variants-page workbench-page">
      <PageWorkbenchShell
        storageKey="variants"
        ariaLabel={t({ zh: '变体筛选工作台', en: 'Variant workbench' })}
        className="workbench-page__shell variants-workbench"
        contentScrollRef={model.resultsPaneRef}
        contentOverlay={showResultsQuickNavTop ? <WorkbenchFloatingTopButton onClick={scrollResultsToTop} /> : null}
        toolbarLead={<WorkbenchToolbarFilterStatus label="VARIANTS" activeCount={activeFilters.length} accentTone="steel" />}
        toolbarPrimary={(
          <WorkbenchToolbarCopy
            kicker={t({ zh: '悬浮工作台', en: 'Floating workbench' })}
            title={t({ zh: '变体筛选', en: 'Variant filters' })}
            detail={t({ zh: '战役压力、敌人与阵型阅读台', en: 'Campaign pressure, enemy, and formation reading desk' })}
          />
        )}
        toolbarActions={<WorkbenchToolbarItems items={toolbarItems} layout="cluster" />}
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
              <WorkbenchSidebarFilterActions
                activeCount={activeFilters.length}
                clearLabel={t({ zh: '清空全部', en: 'Clear all' })}
                {...(activeFilters.length > 0 ? { onClear: clearAllFilters } : {})}
              />
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
