import { FilterSidebarPanel } from '../../components/filter-sidebar/FilterSidebarPanel'
import { ChampionsAdditionalFilters } from './ChampionsAdditionalFilters'
import { ChampionsPrimaryFilters } from './ChampionsPrimaryFilters'
import type { ChampionsPageModel } from './types'

interface ChampionsSidebarProps {
  model: ChampionsPageModel
}

export function ChampionsSidebar({ model }: ChampionsSidebarProps) {
  const { t, activeFilterChips, hasActiveFilters, clearAllFilters } = model

  return (
    <FilterSidebarPanel
      title={t({ zh: '英雄筛选', en: 'Champion filters' })}
      titleAs="h3"
      description={t({
        zh: '先用高频条件快速缩小候选英雄，再按需展开身份、来源和机制标签，避免一开始就把低频条件全部摊开。',
        en: 'Use the frequent controls first, then expand identity, source, and mechanic tags only when you need the lower-frequency filters.',
      })}
      status={
        <>
          <span className="filter-sidebar-panel__badge">
            {activeFilterChips.length > 0
              ? t({ zh: `${activeFilterChips.length} 项已启用`, en: `${activeFilterChips.length} active` })
              : t({ zh: '未启用', en: 'Idle' })}
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
        </>
      }
      note={t({
        zh: '关键词、座位、定位和联动队伍保持常驻可见；补充标签折叠收纳，滚动时也能维持同一套浏览节奏。',
        en: 'Keyword, seat, role, and affiliation stay visible, while the supplemental tags stay folded until needed so the panel keeps the same browsing rhythm while you scroll.',
      })}
      ariaLabel={t({ zh: '英雄筛选侧边栏', en: 'Champion filter sidebar' })}
    >
      <ChampionsPrimaryFilters model={model} />
      <ChampionsAdditionalFilters model={model} />
    </FilterSidebarPanel>
  )
}
