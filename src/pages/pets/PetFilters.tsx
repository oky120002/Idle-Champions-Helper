import { FilterChipSingleSelectField } from '../../components/filter-sidebar/FilterChipSingleSelectField'
import { FilterSearchField } from '../../components/filter-sidebar/FilterSearchField'
import { FilterSegmentedField } from '../../components/filter-sidebar/FilterSegmentedField'
import { FilterSidebarPanel } from '../../components/filter-sidebar/FilterSidebarPanel'
import { useI18n } from '../../app/i18n'
import type { AssetFilter, SourceFilter } from './types'

interface PetFiltersProps {
  query: string
  sourceFilter: SourceFilter
  assetFilter: AssetFilter
  onQueryChange: (value: string) => void
  onSourceFilterChange: (value: SourceFilter) => void
  onAssetFilterChange: (value: AssetFilter) => void
  onClearAllFilters: () => void
}

export function PetFilters({
  query,
  sourceFilter,
  assetFilter,
  onQueryChange,
  onSourceFilterChange,
  onAssetFilterChange,
  onClearAllFilters,
}: PetFiltersProps) {
  const { t } = useI18n()
  const activeFilterCount = Number(query.trim().length > 0) + Number(sourceFilter !== 'all') + Number(assetFilter !== 'all')

  return (
    <FilterSidebarPanel
      title={t({ zh: '宠物筛选', en: 'Pet filters' })}
      titleAs="h3"
      description={t({
        zh: '先用搜索、来源和图像状态把宠物目录缩到可读范围，再去右侧对比立绘与获取方式。',
        en: 'Narrow the pet catalog with search, source, and asset state first, then compare illustrations and acquisition details on the right.',
      })}
      status={
        <>
          <span className="filter-sidebar-panel__badge">
            {activeFilterCount > 0
              ? t({ zh: `${activeFilterCount} 项已启用`, en: `${activeFilterCount} active` })
              : t({ zh: '未启用', en: 'Idle' })}
          </span>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              className="action-button action-button--secondary action-button--compact"
              onClick={onClearAllFilters}
            >
              {t({ zh: '清空全部', en: 'Clear all' })}
            </button>
          ) : null}
        </>
      }
      note={t({
        zh: '来源改成了更直观的芯片切换；搜索负责关键字，图像状态负责快速区分完整资源和待补图目。',
        en: 'Source now uses direct filter chips. Search handles keywords, while the asset-state toggle quickly separates complete entries from missing-art rows.',
      })}
      statusAriaLabel={t({ zh: '筛选状态操作', en: 'Filter status actions' })}
      ariaLabel={t({ zh: '宠物筛选侧边栏', en: 'Pet filter sidebar' })}
    >
      <FilterSearchField
        label={t({ zh: '搜索', en: 'Search' })}
        value={query}
        onChange={onQueryChange}
        hint={t({
          zh: '支持匹配宠物名、描述和礼包名。',
          en: 'Matches pet names, descriptions, and pack names.',
        })}
        placeholder={t({ zh: '搜索宠物、描述或礼包名', en: 'Search pets, descriptions, or pack names' })}
      />

      <FilterChipSingleSelectField
        label={t({ zh: '来源', en: 'Source' })}
        value={sourceFilter}
        onChange={onSourceFilterChange}
        groupLabel={t({ zh: '宠物来源', en: 'Pet source' })}
        hint={t({
          zh: '直接点来源芯片，快速切到宝石商店、付费包、赞助商商店或暂未开放条目。',
          en: 'Use the source chips to jump directly into gem shop, premium, patron, or not-yet-available entries.',
        })}
        options={[
          { value: 'all', label: t({ zh: '全部来源', en: 'All sources' }) },
          { value: 'gems', label: t({ zh: '宝石商店', en: 'Gem shop' }) },
          { value: 'premium', label: t({ zh: '付费购买', en: 'Premium purchase' }) },
          { value: 'patron', label: t({ zh: '赞助商商店', en: 'Patron shop' }) },
          { value: 'not-yet-available', label: t({ zh: '暂未开放', en: 'Not yet available' }) },
          { value: 'unknown', label: t({ zh: '待确认', en: 'Unconfirmed' }) },
        ]}
      />

      <FilterSegmentedField
        label={t({ zh: '图像状态', en: 'Asset state' })}
        value={assetFilter}
        onChange={onAssetFilterChange}
        groupLabel={t({ zh: '图像状态', en: 'Asset state' })}
        hint={t({
          zh: '快速区分已有完整图像和仍待补全的宠物。',
          en: 'Quickly separate fully illustrated pets from entries that still need assets.',
        })}
        options={[
          { value: 'all', label: t({ zh: '全部', en: 'All' }) },
          { value: 'complete', label: t({ zh: '完整图像', en: 'Complete' }) },
          { value: 'missing', label: t({ zh: '缺图像', en: 'Missing art' }) },
        ]}
      />
    </FilterSidebarPanel>
  )
}
