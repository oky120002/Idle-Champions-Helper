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
    <div className="pets-page__filters" aria-label={t({ zh: '宠物筛选', en: 'Pet filters' })}>
      <label className="field-label pets-page__search">
        <span>{t({ zh: '搜索', en: 'Search' })}</span>
        <input
          className="text-input"
          type="search"
          value={query}
          placeholder={t({ zh: '搜索宠物、描述或礼包名', en: 'Search pets, descriptions, or pack names' })}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <label className="field-label">
        <span>{t({ zh: '来源', en: 'Source' })}</span>
        <select
          className="select-input"
          value={sourceFilter}
          onChange={(event) => onSourceFilterChange(event.target.value as SourceFilter)}
        >
          <option value="all">{t({ zh: '全部来源', en: 'All sources' })}</option>
          <option value="gems">{t({ zh: '宝石商店', en: 'Gem shop' })}</option>
          <option value="premium">{t({ zh: '付费购买', en: 'Premium purchase' })}</option>
          <option value="patron">{t({ zh: '赞助商商店', en: 'Patron shop' })}</option>
          <option value="not-yet-available">{t({ zh: '暂未开放', en: 'Not yet available' })}</option>
          <option value="unknown">{t({ zh: '待确认', en: 'Unconfirmed' })}</option>
        </select>
      </label>

      <div className="field-label pets-page__asset-filter">
        <span>{t({ zh: '图像状态', en: 'Asset state' })}</span>
        <div className="segmented-control" role="group" aria-label={t({ zh: '图像状态', en: 'Asset state' })}>
          {[
            ['all', t({ zh: '全部', en: 'All' })],
            ['complete', t({ zh: '完整图像', en: 'Complete' })],
            ['missing', t({ zh: '缺图像', en: 'Missing art' })],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={
                assetFilter === value ? 'segmented-control__button segmented-control__button--active' : 'segmented-control__button'
              }
              aria-pressed={assetFilter === value}
              onClick={() => onAssetFilterChange(value as AssetFilter)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
