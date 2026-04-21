import { FilterSidebarLayout } from '../components/filter-sidebar/FilterSidebarLayout'
import { FilterSidebarToolbar } from '../components/filter-sidebar/FilterSidebarToolbar'
import { PageTabHeader } from '../components/PageTabHeader'
import { StatusBanner } from '../components/StatusBanner'
import { SurfaceCard } from '../components/SurfaceCard'
import { IllustrationsMetrics } from './illustrations/IllustrationsMetrics'
import { IllustrationsResultsSection } from './illustrations/IllustrationsResultsSection'
import { IllustrationsSidebar } from './illustrations/IllustrationsSidebar'
import { useIllustrationsPageModel } from './illustrations/useIllustrationsPageModel'

export function IllustrationsPage() {
  const model = useIllustrationsPageModel()
  const { state, t, activeFilterChips, hasActiveFilters, ui, actions } = model

  return (
    <div className="page-shell illustrations-page">
      <SurfaceCard
        headerContent={
          <PageTabHeader
            eyebrow={t({ zh: '立绘图鉴', en: 'Illustration catalog' })}
            accentLabel="ART CODEX"
            aside={state.status === 'ready' ? <IllustrationsMetrics model={model} /> : null}
            layout="headline"
          />
        }
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

        {state.status === 'ready' ? (
          <>
            <FilterSidebarLayout
              storageKey="illustrations"
              sidebar={<IllustrationsSidebar model={model} />}
              toolbar={
                <FilterSidebarToolbar
                  title={t({ zh: '立绘筛选抽屉', en: 'Illustration filter drawer' })}
                  description={t({
                    zh: '收起时把舞台让给图像卡片；需要补条件时再把左侧抽屉滑出来。',
                    en: 'Collapse the drawer to hand the stage back to the artwork, then slide it open again when you need more conditions.',
                  })}
                  status={
                    <span className="filter-sidebar-toolbar__badge">
                      {activeFilterChips.length > 0
                        ? t({ zh: `${activeFilterChips.length} 项已启用`, en: `${activeFilterChips.length} active` })
                        : t({ zh: '当前未启用条件', en: 'No active filters' })}
                    </span>
                  }
                  actions={
                    <>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          className="action-button action-button--secondary action-button--compact"
                          onClick={actions.clearAllFilters}
                        >
                          {t({ zh: '清空全部', en: 'Clear all' })}
                        </button>
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
                  }
                />
              }
            >
              <IllustrationsResultsSection model={model} />
            </FilterSidebarLayout>
          </>
        ) : null}
      </SurfaceCard>
    </div>
  )
}
