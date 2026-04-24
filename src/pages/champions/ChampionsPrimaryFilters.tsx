import { LocalizedText } from '../../components/LocalizedText'
import {
  FilterSidebarSchemaRenderer,
  type FilterSidebarGroupSchema,
} from '../../components/filter-sidebar/FilterSidebarSchemaRenderer'
import { ActiveFilterChipBar } from '../../features/champion-filters/ActiveFilterChipBar'
import { seatOptions } from '../../features/champion-filters/options'
import { formatSeatLabel, getRoleLabel } from '../../domain/localizedText'
import type { ChampionsPageModel } from './types'

interface ChampionsPrimaryFiltersProps {
  model: ChampionsPageModel
}

export function ChampionsPrimaryFilters({ model }: ChampionsPrimaryFiltersProps) {
  const {
    locale,
    t,
    search,
    selectedSeats,
    selectedRoles,
    selectedAffiliations,
    roles,
    affiliations,
    activeFilterChips,
    updateSearch,
    clearActiveFilterChip,
    resetSeats,
    toggleSeat,
    resetRole,
    toggleRole,
    resetAffiliation,
    toggleAffiliation,
  } = model
  const groups: FilterSidebarGroupSchema[] = [
    {
      kind: 'plain',
      id: 'frequent',
      label: t({ zh: '高频条件', en: 'Frequent filters' }),
      fields: [
        {
          kind: 'search',
          id: 'keyword',
          label: t({ zh: '关键词', en: 'Keyword' }),
          value: search,
          onChange: updateSearch,
          hint: t({
            zh: '支持中英混搜；切换界面语言时，当前关键词和筛选不会被清空。',
            en: 'Chinese and English queries both work here, and switching UI language keeps the current filters.',
          }),
          placeholder: t({ zh: '搜英雄名、标签、联动队伍', en: 'Search names, tags, or affiliations' }),
          type: 'text',
        },
        {
          kind: 'chip-multi',
          id: 'seats',
          label: t({ zh: '座位', en: 'Seat' }),
          hint: t({ zh: '支持多选；同一维度按“或”命中。', en: 'Multi-select is supported, and matches within this group use OR.' }),
          options: seatOptions.map((seat) => ({ id: seat, label: formatSeatLabel(seat, locale) })),
          selectedValues: selectedSeats,
          allLabel: t({ zh: '全部', en: 'All' }),
          onReset: resetSeats,
          onToggle: (value) => toggleSeat(Number(value)),
        },
        {
          kind: 'chip-multi',
          id: 'roles',
          label: t({ zh: '定位', en: 'Role' }),
          hint: t({ zh: '支持多选；会匹配任一已选定位。', en: 'Multi-select is supported, and champions can match any selected role.' }),
          options: roles.map((role) => ({ id: role, label: getRoleLabel(role, locale) })),
          selectedValues: selectedRoles,
          allLabel: t({ zh: '全部', en: 'All' }),
          onReset: resetRole,
          onToggle: (value) => toggleRole(String(value)),
        },
        {
          kind: 'chip-multi',
          id: 'affiliations',
          label: t({ zh: '联动队伍', en: 'Affiliation' }),
          hint: t({ zh: '支持多选；适合同时看多个联动队伍候选。', en: 'Multi-select is supported for comparing multiple affiliations at once.' }),
          options: affiliations.map((affiliation) => ({
            id: affiliation.original,
            label: <LocalizedText text={affiliation} mode="primary" />,
          })),
          selectedValues: selectedAffiliations,
          allLabel: t({ zh: '全部', en: 'All' }),
          onReset: resetAffiliation,
          onToggle: (value) => toggleAffiliation(String(value)),
        },
      ],
    },
  ]

  return (
    <>
      <ActiveFilterChipBar
        chips={activeFilterChips}
        hint={t({
          zh: '点击任一条件即可单独清空对应维度；全量回退统一用上方的清空全部。',
          en: 'Click any filter chip to clear that dimension only, then use the reset button above when you want a full reset.',
        })}
        onClearChip={clearActiveFilterChip}
      />
      <FilterSidebarSchemaRenderer groups={groups} />
    </>
  )
}
