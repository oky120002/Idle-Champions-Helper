import { FilterChipMultiSelectField } from '../../components/filter-sidebar/FilterChipMultiSelectField'
import { FilterSearchField } from '../../components/filter-sidebar/FilterSearchField'
import { FilterSegmentedField } from '../../components/filter-sidebar/FilterSegmentedField'
import { ActiveFilterChipBar } from '../../features/champion-filters/ActiveFilterChipBar'
import { seatOptions } from '../../features/champion-filters/options'
import { formatSeatLabel, getPrimaryLocalizedText, getRoleLabel } from '../../domain/localizedText'
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

export function IllustrationsPrimaryFilters({ model }: IllustrationsPrimaryFiltersProps) {
  const { locale, t, filters, options, activeFilterChips, actions } = model

  return (
    <>
      <ActiveFilterChipBar
        chips={activeFilterChips}
        hint={t({
          zh: '点击任一条件即可单独回退对应维度；全量回退统一使用右上角的清空全部。',
          en: 'Click any chip to clear that dimension only, then use the reset action for a full rollback.',
        })}
        onClearChip={actions.clearActiveFilterChip}
      />

      <div className="filter-sidebar-panel__section-label">{t({ zh: '高频条件', en: 'Frequent filters' })}</div>

      <div className="filter-panel filter-panel--sidebar">
        <FilterSearchField
          label={t({ zh: '关键词', en: 'Keyword' })}
          value={filters.search}
          onChange={actions.updateSearch}
          hint={t({
            zh: '支持中英混搜，也会匹配皮肤名、联动队伍、角色标签和资源 graphic id。',
            en: 'Chinese and English queries both work here, and the search also covers skin names, affiliations, tags, and graphic ids.',
          })}
          placeholder={t({
            zh: '搜英雄名、皮肤名、标签或联动队伍',
            en: 'Search names, skins, tags, or affiliations',
          })}
        />

        <FilterSegmentedField
          label={t({ zh: '范围', en: 'Scope' })}
          value={filters.scope}
          onChange={actions.updateScope}
          groupLabel={t({ zh: '立绘范围', en: 'Illustration scope' })}
          options={SCOPE_OPTIONS.map((option) => ({
            value: option.value,
            label: t(option.label),
          }))}
          hint={t({
            zh: '本体与皮肤可以直接切开，先缩短图片瀑布流再细筛。',
            en: 'Split hero art from skins first when you want to shorten the image stream before filtering deeper.',
          })}
        />

        <FilterChipMultiSelectField
          label={t({ zh: '座位', en: 'Seat' })}
          hint={t({
            zh: '支持多选；同一维度内按“或”匹配。',
            en: 'Multi-select is supported, and matches within this group use OR.',
          })}
          options={seatOptions.map((seat) => ({
            id: seat,
            label: formatSeatLabel(seat, locale),
          }))}
          selectedValues={filters.selectedSeats}
          allLabel={t({ zh: '全部', en: 'All' })}
          onReset={actions.resetSeats}
          onToggle={actions.toggleSeat}
        />

        <FilterChipMultiSelectField
          label={t({ zh: '定位', en: 'Role' })}
          hint={t({
            zh: '按所属英雄的定位过滤，适合先把立绘缩到输出、辅助或坦克线。',
            en: 'Filter by the owning champion roles when you want to stay inside DPS, support, or tank lines first.',
          })}
          options={options.roleOptions.map((role) => ({
            id: role,
            label: getRoleLabel(role, locale),
          }))}
          selectedValues={filters.selectedRoles}
          allLabel={t({ zh: '全部', en: 'All' })}
          onReset={actions.resetRole}
          onToggle={actions.toggleRole}
        />

        <FilterChipMultiSelectField
          label={t({ zh: '联动队伍', en: 'Affiliation' })}
          hint={t({
            zh: '仍然按英雄元数据多选过滤，方便快速切到固定队伍的皮肤资产。',
            en: 'The affiliation filter still works off champion metadata, which is handy for browsing one team’s skins together.',
          })}
          options={options.affiliationOptions.map((affiliation) => ({
            id: affiliation.original,
            label: getPrimaryLocalizedText(affiliation, locale),
          }))}
          selectedValues={filters.selectedAffiliations}
          allLabel={t({ zh: '全部', en: 'All' })}
          onReset={actions.resetAffiliation}
          onToggle={actions.toggleAffiliation}
        />
      </div>
    </>
  )
}
