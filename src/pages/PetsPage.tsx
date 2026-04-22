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
import { PetFilters } from './pets/PetFilters'
import { PetsResultsSection } from './pets/PetsResultsSection'
import { PetsWorkbenchContentHeader } from './pets/PetsWorkbenchContentHeader'
import { usePetsPageModel } from './pets/usePetsPageModel'

export function PetsPage() {
  const model = usePetsPageModel()
  const { state, t, activeFilterCount, filters, actions, ui } = model

  return (
    <div className="pets-page workbench-page">
      <PageWorkbenchShell
        storageKey="pets"
        ariaLabel={t({ zh: '宠物图鉴工作台', en: 'Pet workbench' })}
        className="workbench-page__shell pets-workbench"
        contentScrollRef={model.resultsPaneRef}
        contentOverlay={ui.showResultsQuickNavTop ? <WorkbenchFloatingTopButton onClick={actions.scrollResultsToTop} /> : null}
        toolbarLead={<WorkbenchToolbarMark label="PETS" />}
        toolbarPrimary={(
          <WorkbenchToolbarCopy
            kicker={t({ zh: '悬浮工作台', en: 'Floating workbench' })}
            title={t({ zh: '宠物图鉴', en: 'Pet catalog' })}
            detail={t({ zh: '宠物筛选与资源完整度排查', en: 'Filter pets and audit asset completeness' })}
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
                {t({ zh: `${model.results.filteredPets.length} 只命中`, en: `${model.results.filteredPets.length} matches` })}
              </WorkbenchToolbarBadge>
            ) : null}
            <WorkbenchShareButton state={ui.shareLinkState} onCopy={actions.copyCurrentLink} />
          </>
        )}
        sidebarHeader={(
          <WorkbenchSidebarHeader
            kicker={t({ zh: '筛选抽屉', en: 'Filter drawer' })}
            title={t({ zh: '左侧缩小宠物目录', en: 'Narrow the pet catalog on the left' })}
            description={t({
              zh: '搜索负责关键词，来源和图像状态负责快速切分完整资源与待补条目；右侧保留更大的图鉴卡片比较区。',
              en: 'Search handles keywords, while source and asset state separate complete entries from missing-art rows.',
            })}
            statusLabel={t({ zh: '宠物筛选状态操作', en: 'Pet filter status actions' })}
            status={(
              <>
                <WorkbenchToolbarBadge variant="filter">
                {activeFilterCount > 0
                  ? t({ zh: `${activeFilterCount} 项已启用`, en: `${activeFilterCount} active` })
                  : t({ zh: '当前未启用条件', en: 'No active filters' })}
                </WorkbenchToolbarBadge>
                {activeFilterCount > 0 ? (
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
        sidebar={state.status === 'ready' ? (
          <PetFilters
            query={filters.query}
            sourceFilter={filters.sourceFilter}
            assetFilter={filters.assetFilter}
            onQueryChange={actions.updateQuery}
            onSourceFilterChange={actions.updateSourceFilter}
            onAssetFilterChange={actions.updateAssetFilter}
          />
        ) : (
          <WorkbenchSidebarLoading />
        )}
        contentHeader={state.status === 'ready' ? <PetsWorkbenchContentHeader model={model} /> : null}
      >
        {state.status === 'loading' ? (
          <StatusBanner
            tone="info"
            title={t({ zh: '正在加载宠物目录', en: 'Loading pet catalog' })}
            detail={t({
              zh: '正在读取本地版本化的宠物清单、静态图像与动图索引。',
              en: 'Reading the local versioned pet manifest, static art, and motion preview manifest.',
            })}
          />
        ) : null}

        {state.status === 'error' ? (
          <StatusBanner
            tone="error"
            title={t({ zh: '宠物目录加载失败', en: 'Failed to load pet catalog' })}
            detail={
              state.message
                ? t({
                    zh: `无法读取 pets 数据：${state.message}`,
                    en: `Unable to read pets data: ${state.message}`,
                  })
                : t({
                    zh: '无法读取 pets 数据。',
                    en: 'Unable to read pets data.',
                  })
            }
          />
        ) : null}

        {state.status === 'ready' ? <PetsResultsSection model={model} /> : null}
      </PageWorkbenchShell>
    </div>
  )
}
