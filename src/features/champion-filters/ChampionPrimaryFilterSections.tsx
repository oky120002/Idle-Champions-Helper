import type { ReactNode } from 'react'
import type { AppLocale, LocaleText , TranslateParams} from '../../app/i18n'
import {
  FilterSidebarSchemaRenderer,
  type FilterSidebarFieldSchema,
  type FilterSidebarGroupSchema,
} from '../../components/filter-sidebar/FilterSidebarSchemaRenderer'
import { formatSeatLabel, getRoleLabel } from '../../domain/localizedText'
import type { LocalizedText } from '../../domain/types'
import { ActiveFilterChipBar } from './ActiveFilterChipBar'
import { seatOptions } from './options'
import type { ActiveFilterChip, IdLocalizedOption } from './types'

export interface ChampionPrimaryFilterCopy {
  searchHint: LocaleText
  searchPlaceholder: LocaleText
  seatHint: LocaleText
  roleHint: LocaleText
  affiliationHint: LocaleText
  patronHint: LocaleText
  activeChipHint: LocaleText
}

interface ChampionPrimaryFilterValues {
  search: string
  selectedSeats: number[]
  selectedRoles: string[]
  selectedAffiliations: string[]
  selectedPatrons: string[]
}

interface ChampionPrimaryFilterOptions {
  roleOptions: string[]
  affiliationOptions: LocalizedText[]
  patronOptions: IdLocalizedOption[]
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
  resetPatron: () => void
  togglePatron: (patron: string) => void
}

interface ChampionPrimaryFilterSectionsProps {
  locale: AppLocale
  t: (text: string | LocaleText, params?: TranslateParams) => string
  copy: ChampionPrimaryFilterCopy
  values: ChampionPrimaryFilterValues
  options: ChampionPrimaryFilterOptions
  activeFilterChips: ActiveFilterChip[]
  actions: ChampionPrimaryFilterActions
  buildLocalizedLabel: (text: LocalizedText) => ReactNode
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
  buildLocalizedLabel,
  extraFields = [],
  searchType = 'search',
}: Readonly<ChampionPrimaryFilterSectionsProps>) {
  const groups: FilterSidebarGroupSchema[] = [
    {
      kind: 'plain',
      id: 'frequent',
      label: t("高频条件"),
      fields: [
        {
          kind: 'search',
          id: 'keyword',
          label: t("关键词"),
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
          label: t("座位"),
          hint: t(copy.seatHint),
          options: seatOptions.map((seat) => ({
            id: seat,
            label: formatSeatLabel(seat, locale),
          })),
          selectedValues: values.selectedSeats,
          allLabel: t("全部"),
          onReset: actions.resetSeats,
          onToggle: (value) => actions.toggleSeat(Number(value)),
        },
        {
          kind: 'chip-multi',
          id: 'roles',
          label: t("定位"),
          hint: t(copy.roleHint),
          options: options.roleOptions.map((role) => ({
            id: role,
            label: getRoleLabel(role, locale),
          })),
          selectedValues: values.selectedRoles,
          allLabel: t("全部"),
          onReset: actions.resetRole,
          onToggle: (value) => actions.toggleRole(String(value)),
        },
        {
          kind: 'chip-multi',
          id: 'affiliations',
          label: t("联动队伍"),
          hint: t(copy.affiliationHint),
          options: options.affiliationOptions.map((affiliation) => ({
            id: affiliation.original,
            label: buildLocalizedLabel(affiliation),
          })),
          selectedValues: values.selectedAffiliations,
          allLabel: t("全部"),
          onReset: actions.resetAffiliation,
          onToggle: (value) => actions.toggleAffiliation(String(value)),
        },
        ...(options.patronOptions.length > 0
          ? [
              {
                kind: 'chip-multi' as const,
                id: 'patrons',
                label: t("赞助人"),
                hint: t(copy.patronHint),
                options: options.patronOptions.map((patron) => ({
                  id: patron.id,
                  label: buildLocalizedLabel(patron),
                })),
                selectedValues: values.selectedPatrons,
                allLabel: t("全部"),
                onReset: actions.resetPatron,
                onToggle: (value: string | number) => actions.togglePatron(String(value)),
              },
            ]
          : []),
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
