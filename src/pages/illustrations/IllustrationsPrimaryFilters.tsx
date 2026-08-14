import type { FilterSidebarFieldSchema } from '../../components/filter-sidebar/FilterSidebarSchemaRenderer'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import {
  ChampionPrimaryFilterSections,
  type ChampionPrimaryFilterCopy,
} from '../../features/champion-filters/ChampionPrimaryFilterSections'
import type { MessageRef } from '../../app/i18n'
import type { IllustrationsPageModel, ViewFilter } from './types'

const SCOPE_OPTIONS: ReadonlyArray<{
  value: ViewFilter
  label: MessageRef
}> = [
  { value: 'all', label: { key: '全部' } },
  { value: 'hero-base', label: { key: '本体' } },
  { value: 'skin', label: { key: '皮肤' } },
]

type IllustrationsPrimaryFiltersProps = {
  readonly model: IllustrationsPageModel
}

const illustrationsPrimaryFilterCopy: ChampionPrimaryFilterCopy = {
  searchHint: { key: '支持中英混搜，也会匹配皮肤名、联动队伍、角色标签和资源 graphic id。' },
  searchPlaceholder: { key: '搜英雄名、皮肤名、标签或联动队伍' },
  seatHint: { key: '支持多选；同一维度内按或匹配。' },
  roleHint: { key: '按所属英雄的定位过滤，适合先把立绘缩到输出、辅助或坦克线。' },
  affiliationHint: { key: '仍然按英雄元数据多选过滤，方便快速切到固定队伍的皮肤资产。' },
  patronHint: { key: '按赞助人合约筛选。' },
  activeChipHint: { key: '点击任一条件即可单独回退对应维度；全量回退统一使用右上角的清空全部。' },
}

export function IllustrationsPrimaryFilters({ model }: IllustrationsPrimaryFiltersProps) {
  const { locale, t, filters, options, activeFilterChips, actions } = model
  const extraFields: FilterSidebarFieldSchema[] = [
    {
      kind: 'segmented',
      id: 'scope',
      label: t("范围"),
      value: filters.scope,
      onChange: (value) => actions.updateScope(value as ViewFilter),
      groupLabel: t("立绘范围"),
      options: SCOPE_OPTIONS.map((option) => ({
        value: option.value,
        label: t(option.label),
      })),
      hint: t("本体与皮肤可以直接切开，先缩短图片瀑布流再细筛。"),
    },
  ]

  return (
    <ChampionPrimaryFilterSections
      locale={locale}
      t={t}
      copy={illustrationsPrimaryFilterCopy}
      values={{
        search: filters.search,
        selectedSeats: filters.selectedSeats,
        selectedRoles: filters.selectedRoles,
        selectedAffiliations: filters.selectedAffiliations,
        selectedPatrons: filters.selectedPatrons,
      }}
      options={{
        roleOptions: options.roleOptions,
        affiliationOptions: options.affiliationOptions,
        patronOptions: options.patronOptions,
      }}
      activeFilterChips={activeFilterChips}
      actions={{
        updateSearch: actions.updateSearch,
        clearActiveFilterChip: actions.clearActiveFilterChip,
        resetSeats: actions.resetSeats,
        toggleSeat: actions.toggleSeat,
        resetRole: actions.resetRole,
        toggleRole: actions.toggleRole,
        resetAffiliation: actions.resetAffiliation,
        toggleAffiliation: actions.toggleAffiliation,
        resetPatron: actions.resetPatron,
        togglePatron: actions.togglePatron,
      }}
      buildLocalizedLabel={(text) => getPrimaryLocalizedText(text, locale)}
      extraFields={extraFields}
    />
  )
}
