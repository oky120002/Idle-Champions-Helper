import { FilterChipSingleSelectField } from '../../components/filter-sidebar/FilterChipSingleSelectField'
import { FilterSearchField } from '../../components/filter-sidebar/FilterSearchField'
import { FilterSegmentedField } from '../../components/filter-sidebar/FilterSegmentedField'
import { useI18n } from '../../app/i18n'
import type { AssetFilter, SourceFilter } from './types'

interface PetFiltersProps {
  query: string
  sourceFilter: SourceFilter
  assetFilter: AssetFilter
  onQueryChange: (value: string) => void
  onSourceFilterChange: (value: SourceFilter) => void
  onAssetFilterChange: (value: AssetFilter) => void
}

export function PetFilters({
  query,
  sourceFilter,
  assetFilter,
  onQueryChange,
  onSourceFilterChange,
  onAssetFilterChange,
}: PetFiltersProps) {
  const { t } = useI18n()

  return (
    <div className="workbench-page__sidebar-stack">
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
    </div>
  )
}
