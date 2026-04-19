import { FilterSidebarPanel } from '../../components/filter-sidebar/FilterSidebarPanel'
import { IllustrationsAdditionalFilters } from './IllustrationsAdditionalFilters'
import { IllustrationsPrimaryFilters } from './IllustrationsPrimaryFilters'
import type { IllustrationsPageModel } from './types'

type IllustrationsSidebarProps = {
  model: IllustrationsPageModel
}

export function IllustrationsSidebar({ model }: IllustrationsSidebarProps) {
  const { t, activeFilterChips, hasActiveFilters, ui, actions } = model

  return (
    <FilterSidebarPanel
      title={t({ zh: '立绘筛选', en: 'Illustration filters' })}
      titleAs="h3"
      titleTrailing={
        <button
          type="button"
          className={
            ui.shareLinkState === 'success'
              ? 'action-button action-button--ghost action-button--compact action-button--toggled illustrations-page__share-button'
              : 'action-button action-button--ghost action-button--compact illustrations-page__share-button'
          }
          onClick={() => {
            void actions.copyCurrentLink()
          }}
        >
          {ui.shareButtonLabel}
        </button>
      }
      description={t({
        zh: '沿用英雄筛选页的主线：先用高频条件迅速缩小范围，再按需展开低频标签条件，避免一上来把整页立绘全砸出来。',
        en: 'This follows the champion filter flow: use the frequent controls first, then open the lower-frequency tag groups only when you need them.',
      })}
      status={
        <div className="illustrations-page__sidebar-status">
          <div className="illustrations-page__sidebar-actions">
            <span className="filter-sidebar-panel__badge">
              {activeFilterChips.length > 0
                ? t({ zh: `${activeFilterChips.length} 项已启用`, en: `${activeFilterChips.length} active` })
                : t({ zh: '未启用', en: 'Idle' })}
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
      }
      statusLabel={t({ zh: '立绘筛选状态操作', en: 'Illustration filter status actions' })}
      note={t({
        zh: '默认只渲染前一批结果卡片；只有继续点“显示全部”，剩余立绘才会进入页面并触发图片加载。',
        en: 'Only the first batch of result cards is rendered by default; the remaining illustrations stay out of the DOM until you ask to reveal everything.',
      })}
      ariaLabel={t({ zh: '立绘筛选侧边栏', en: 'Illustration filter sidebar' })}
      className="illustrations-page__filter-surface"
    >
      <IllustrationsPrimaryFilters model={model} />
      <IllustrationsAdditionalFilters model={model} />
    </FilterSidebarPanel>
  )
}
