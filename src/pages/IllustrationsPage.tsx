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
import { IllustrationsAdditionalFilters } from './illustrations/IllustrationsAdditionalFilters'
import { IllustrationsPrimaryFilters } from './illustrations/IllustrationsPrimaryFilters'
import { IllustrationsResultsSection } from './illustrations/IllustrationsResultsSection'
import { IllustrationsWorkbenchContentHeader } from './illustrations/IllustrationsWorkbenchContentHeader'
import { useIllustrationsPageModel } from './illustrations/useIllustrationsPageModel'

export function IllustrationsPage() {
  const model = useIllustrationsPageModel()
  const { state, t, activeFilterChips, hasActiveFilters, ui, actions } = model

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
        toolbarLead={<WorkbenchToolbarMark label="ART CODEX" />}
        toolbarPrimary={(
          <WorkbenchToolbarCopy
            kicker={t({ zh: '悬浮工作台', en: 'Floating workbench' })}
            title={t({ zh: '立绘图鉴', en: 'Illustration catalog' })}
            detail={t({ zh: '立绘筛选与动态资源对照', en: 'Filter artwork and compare motion resources' })}
          />
        )}
        toolbarActions={(
          <>
            <WorkbenchToolbarBadge variant="filter">
              {activeFilterChips.length > 0
                ? t({ zh: `${activeFilterChips.length} 项条件`, en: `${activeFilterChips.length} active` })
                : t({ zh: '条件待命', en: 'Filters idle' })}
            </WorkbenchToolbarBadge>
            {state.status === 'ready' ? (
              <WorkbenchToolbarBadge variant="filter" tone="muted">
                {t({ zh: `${model.results.filteredIllustrationEntries.length} 命中`, en: `${model.results.filteredIllustrationEntries.length} matches` })}
              </WorkbenchToolbarBadge>
            ) : null}
            <WorkbenchShareButton state={ui.shareLinkState} onCopy={actions.copyCurrentLink} />
          </>
        )}
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
                <WorkbenchToolbarBadge variant="filter">
                  {activeFilterChips.length > 0
                    ? t({ zh: `${activeFilterChips.length} 项已启用`, en: `${activeFilterChips.length} active` })
                    : t({ zh: '当前未启用条件', en: 'No active filters' })}
                </WorkbenchToolbarBadge>
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
