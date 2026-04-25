import type { FilterSidebarFieldSchema } from '../../components/filter-sidebar/FilterSidebarSchemaRenderer'
import { getPrimaryLocalizedText } from '../../domain/localizedText'
import {
  ChampionPrimaryFilterSections,
  type ChampionPrimaryFilterCopy,
} from '../../features/champion-filters/ChampionPrimaryFilterSections'
import type { IllustrationsPageModel, ViewFilter } from './types'

const SCOPE_OPTIONS: ReadonlyArray<{
  value: ViewFilter
  label: {
    zh: string
    en: string
  }
}> = [
  { value: 'all', label: { zh: '全部', en: 'All' } },
  { value: 'hero-base', label: { zh: '本体', en: 'Heroes' } },
  { value: 'skin', label: { zh: '皮肤', en: 'Skins' } },
]

type IllustrationsPrimaryFiltersProps = {
  model: IllustrationsPageModel
}

const illustrationsPrimaryFilterCopy: ChampionPrimaryFilterCopy = {
  searchHint: {
    zh: '支持中英混搜，也会匹配皮肤名、联动队伍、角色标签和资源 graphic id。',
    en: 'Chinese and English queries both work here, and the search also covers skin names, affiliations, tags, and graphic ids.',
  },
  searchPlaceholder: {
    zh: '搜英雄名、皮肤名、标签或联动队伍',
    en: 'Search names, skins, tags, or affiliations',
  },
  seatHint: {
    zh: '支持多选；同一维度内按“或”匹配。',
    en: 'Multi-select is supported, and matches within this group use OR.',
  },
  roleHint: {
    zh: '按所属英雄的定位过滤，适合先把立绘缩到输出、辅助或坦克线。',
    en: 'Filter by the owning champion roles when you want to stay inside DPS, support, or tank lines first.',
  },
  affiliationHint: {
    zh: '仍然按英雄元数据多选过滤，方便快速切到固定队伍的皮肤资产。',
    en: 'The affiliation filter still works off champion metadata, which is handy for browsing one team’s skins together.',
  },
  activeChipHint: {
    zh: '点击任一条件即可单独回退对应维度；全量回退统一使用右上角的清空全部。',
    en: 'Click any chip to clear that dimension only, then use the reset action for a full rollback.',
  },
}

export function IllustrationsPrimaryFilters({ model }: IllustrationsPrimaryFiltersProps) {
  const { locale, t, filters, options, activeFilterChips, actions } = model
  const extraFields: FilterSidebarFieldSchema[] = [
    {
      kind: 'segmented',
      id: 'scope',
      label: t({ zh: '范围', en: 'Scope' }),
      value: filters.scope,
      onChange: (value) => actions.updateScope(value as ViewFilter),
      groupLabel: t({ zh: '立绘范围', en: 'Illustration scope' }),
      options: SCOPE_OPTIONS.map((option) => ({
        value: option.value,
        label: t(option.label),
      })),
      hint: t({
        zh: '本体与皮肤可以直接切开，先缩短图片瀑布流再细筛。',
        en: 'Split hero art from skins first when you want to shorten the image stream before filtering deeper.',
      }),
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
      }}
      options={{
        roleOptions: options.roleOptions,
        affiliationOptions: options.affiliationOptions,
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
      }}
      buildAffiliationLabel={(affiliation) => getPrimaryLocalizedText(affiliation, locale)}
      extraFields={extraFields}
    />
  )
}
