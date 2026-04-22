import { PageWorkbenchShell } from '../components/workbench/PageWorkbenchShell'
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
    <div className="pets-page pets-page--workbench">
      <PageWorkbenchShell
        storageKey="pets"
        ariaLabel={t({ zh: '宠物图鉴工作台', en: 'Pet workbench' })}
        className="pets-workbench"
        contentScrollRef={model.resultsPaneRef}
        contentOverlay={ui.showResultsQuickNavTop ? <WorkbenchFloatingTopButton onClick={actions.scrollResultsToTop} /> : null}
        toolbarLead={(
          <div className="pets-workbench__toolbar-mark" aria-hidden="true">
            <span className="pets-workbench__toolbar-mark-dot" />
            <span className="pets-workbench__toolbar-mark-label">PETS</span>
          </div>
        )}
        toolbarPrimary={(
          <div className="pets-workbench__toolbar-copy">
            <span className="pets-workbench__toolbar-kicker">{t({ zh: '悬浮工作台', en: 'Floating workbench' })}</span>
            <strong className="pets-workbench__toolbar-title">{t({ zh: '宠物图鉴', en: 'Pet catalog' })}</strong>
            <span className="pets-workbench__toolbar-detail">
              {t({ zh: '宠物筛选与资源完整度排查', en: 'Filter pets and audit asset completeness' })}
            </span>
          </div>
        )}
        toolbarActions={(
          <>
            <span className="filter-sidebar-panel__badge pets-workbench__toolbar-badge">
              {activeFilterCount > 0
                ? t({ zh: `${activeFilterCount} 项条件`, en: `${activeFilterCount} active` })
                : t({ zh: '条件待命', en: 'Filters idle' })}
            </span>
            {state.status === 'ready' ? (
              <span className="filter-sidebar-panel__badge pets-workbench__toolbar-badge pets-workbench__toolbar-badge--muted">
                {t({ zh: `${model.results.filteredPets.length} 只命中`, en: `${model.results.filteredPets.length} matches` })}
              </span>
            ) : null}
            <button
              type="button"
              className={
                ui.shareLinkState === 'success'
                  ? 'action-button action-button--ghost action-button--compact action-button--toggled'
                  : 'action-button action-button--ghost action-button--compact'
              }
              onClick={() => {
                void actions.copyCurrentLink()
              }}
            >
              {ui.shareButtonLabel}
            </button>
          </>
        )}
        sidebarHeader={(
          <div className="pets-workbench__sidebar-header">
            <div className="pets-workbench__sidebar-copy">
              <p className="pets-workbench__sidebar-kicker">{t({ zh: '筛选抽屉', en: 'Filter drawer' })}</p>
              <h3 className="pets-workbench__sidebar-title">{t({ zh: '左侧缩小宠物目录', en: 'Narrow the pet catalog on the left' })}</h3>
              <p className="pets-workbench__sidebar-description">
                {t({
                  zh: '搜索负责关键词，来源和图像状态负责快速切分完整资源与待补条目；右侧保留更大的图鉴卡片比较区。',
                  en: 'Search handles keywords, while source and asset state separate complete entries from missing-art rows.',
                })}
              </p>
            </div>

            <div className="pets-workbench__sidebar-status" role="group" aria-label={t({ zh: '宠物筛选状态操作', en: 'Pet filter status actions' })}>
              <span className="filter-sidebar-panel__badge">
                {activeFilterCount > 0
                  ? t({ zh: `${activeFilterCount} 项已启用`, en: `${activeFilterCount} active` })
                  : t({ zh: '当前未启用条件', en: 'No active filters' })}
              </span>
              {activeFilterCount > 0 ? (
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
          <div className="pets-workbench__sidebar-loading" aria-hidden="true" />
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
