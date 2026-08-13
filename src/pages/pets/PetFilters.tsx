import {
  FilterSidebarSchemaRenderer,
  type FilterSidebarGroupSchema,
} from '../../components/filter-sidebar/FilterSidebarSchemaRenderer'
import { useI18n } from '../../app/i18n'
import type { AssetFilter, SourceFilter } from './types'

interface PetFiltersProps {
  readonly query: string
  readonly sourceFilter: SourceFilter
  readonly assetFilter: AssetFilter
  readonly onQueryChange: (value: string) => void
  readonly onSourceFilterChange: (value: SourceFilter) => void
  readonly onAssetFilterChange: (value: AssetFilter) => void
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
  const groups: FilterSidebarGroupSchema[] = [
    {
      kind: 'plain',
      id: 'pet-filters',
      fields: [
        {
          kind: 'search',
          id: 'keyword',
          label: t("搜索"),
          value: query,
          onChange: onQueryChange,
          hint: t("支持匹配宠物名、描述和礼包名。"),
          placeholder: t("搜索宠物、描述或礼包名"),
        },
        {
          kind: 'chip-single',
          id: 'source',
          label: t("来源"),
          value: sourceFilter,
          onChange: (value) => onSourceFilterChange(value as SourceFilter),
          groupLabel: t("宠物来源"),
          hint: t("直接点来源芯片，快速切到宝石商店、付费包、赞助商商店或暂未开放条目。"),
          options: [
            { value: 'all', label: t("全部来源") },
            { value: 'gems', label: t("宝石商店") },
            { value: 'premium', label: t("付费购买") },
            { value: 'patron', label: t("赞助商商店") },
            { value: 'not-yet-available', label: t("暂未开放") },
            { value: 'unknown', label: t("待确认") },
          ],
        },
        {
          kind: 'segmented',
          id: 'asset',
          label: t("图像状态"),
          value: assetFilter,
          onChange: (value) => onAssetFilterChange(value as AssetFilter),
          groupLabel: t("图像状态"),
          hint: t("快速区分已有完整图像和仍待补全的宠物。"),
          options: [
            { value: 'all', label: t("全部") },
            { value: 'complete', label: t("完整图像") },
            { value: 'missing', label: t("缺图像") },
          ],
        },
      ],
    },
  ]

  return <FilterSidebarSchemaRenderer groups={groups} />
}
