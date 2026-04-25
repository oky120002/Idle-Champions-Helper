import type { ReactNode } from 'react'
import type { AppLocale, LocaleText } from '../../app/i18n'
import {
  FilterSidebarSchemaRenderer,
  type FilterSidebarFieldSchema,
  type FilterSidebarGroupSchema,
} from '../../components/filter-sidebar/FilterSidebarSchemaRenderer'
import { ActiveFilterChipBar } from './ActiveFilterChipBar'
import { seatOptions } from './options'
import { formatSeatLabel, getRoleLabel } from '../../domain/localizedText'
import type { LocalizedText } from '../../domain/types'
import type { ActiveFilterChip } from './types'

export interface ChampionPrimaryFilterCopy {
  searchHint: LocaleText
  searchPlaceholder: LocaleText
  seatHint: LocaleText
  roleHint: LocaleText
  affiliationHint: LocaleText
  activeChipHint: LocaleText
}

interface ChampionPrimaryFilterValues {
  search: string
  selectedSeats: number[]
  selectedRoles: string[]
  selectedAffiliations: string[]
}

interface ChampionPrimaryFilterOptions {
  roleOptions: string[]
  affiliationOptions: LocalizedText[]
}

interface ChampionPrimaryFilterActions {
  updateSearch: (value: string) => void
  clearActiveFilterChip: (id: ActiveFilterChip['id']) => void
  resetSeats: () => void
  toggleSeat: (seat: number) => void
  resetRole: () => void
  toggleRole: (role: string) => void
  resetAffiliation: () => void
  toggleAffiliation: (affiliation: string) => void
}

interface ChampionPrimaryFilterSectionsProps {
  locale: AppLocale
  t: (text: LocaleText) => string
  copy: ChampionPrimaryFilterCopy
  values: ChampionPrimaryFilterValues
  options: ChampionPrimaryFilterOptions
  activeFilterChips: ActiveFilterChip[]
  actions: ChampionPrimaryFilterActions
  buildAffiliationLabel: (affiliation: LocalizedText) => ReactNode
  extraFields?: FilterSidebarFieldSchema[]
  searchType?: 'search' | 'text'
}

export function ChampionPrimaryFilterSections({
  locale,
  t,
  copy,
  values,
  options,
  activeFilterChips,
  actions,
  buildAffiliationLabel,
  extraFields = [],
  searchType = 'search',
}: ChampionPrimaryFilterSectionsProps) {
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
          value: values.search,
          onChange: actions.updateSearch,
          hint: t(copy.searchHint),
          placeholder: t(copy.searchPlaceholder),
          type: searchType,
        },
        ...extraFields,
        {
          kind: 'chip-multi',
          id: 'seats',
          label: t({ zh: '座位', en: 'Seat' }),
          hint: t(copy.seatHint),
          options: seatOptions.map((seat) => ({
            id: seat,
            label: formatSeatLabel(seat, locale),
          })),
          selectedValues: values.selectedSeats,
          allLabel: t({ zh: '全部', en: 'All' }),
          onReset: actions.resetSeats,
          onToggle: (value) => actions.toggleSeat(Number(value)),
        },
        {
          kind: 'chip-multi',
          id: 'roles',
          label: t({ zh: '定位', en: 'Role' }),
          hint: t(copy.roleHint),
          options: options.roleOptions.map((role) => ({
            id: role,
            label: getRoleLabel(role, locale),
          })),
          selectedValues: values.selectedRoles,
          allLabel: t({ zh: '全部', en: 'All' }),
          onReset: actions.resetRole,
          onToggle: (value) => actions.toggleRole(String(value)),
        },
        {
          kind: 'chip-multi',
          id: 'affiliations',
          label: t({ zh: '联动队伍', en: 'Affiliation' }),
          hint: t(copy.affiliationHint),
          options: options.affiliationOptions.map((affiliation) => ({
            id: affiliation.original,
            label: buildAffiliationLabel(affiliation),
          })),
          selectedValues: values.selectedAffiliations,
          allLabel: t({ zh: '全部', en: 'All' }),
          onReset: actions.resetAffiliation,
          onToggle: (value) => actions.toggleAffiliation(String(value)),
        },
      ],
    },
  ]

  return (
    <>
      <ActiveFilterChipBar
        chips={activeFilterChips}
        hint={t(copy.activeChipHint)}
        onClearChip={actions.clearActiveFilterChip}
      />
      <FilterSidebarSchemaRenderer groups={groups} />
    </>
  )
}
