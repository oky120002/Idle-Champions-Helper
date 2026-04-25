import type { ReactNode } from 'react'
import type { AppLocale, LocaleText } from '../../app/i18n'
import {
  FilterSidebarSchemaRenderer,
  type FilterSidebarGroupSchema,
} from '../../components/filter-sidebar/FilterSidebarSchemaRenderer'
import { getChampionAttributeGroupLabel, getChampionTagLabel } from '../../domain/championTags'
import { MechanicFilterFieldGroup } from './MechanicFilterFieldGroup'
import type { MechanicOptionGroup } from './types'

export interface ChampionAdditionalFilterCopy {
  metaTitle: LocaleText
  metaSummary: LocaleText
  raceHint: LocaleText
  genderHint: LocaleText
  alignmentHint: LocaleText
  professionHint: LocaleText
  acquisitionHint: LocaleText
  mechanicHint: LocaleText
}

interface ChampionAdditionalFilterValues {
  selectedRaces: string[]
  selectedGenders: string[]
  selectedAlignments: string[]
  selectedProfessions: string[]
  selectedAcquisitions: string[]
  selectedMechanics: string[]
}

interface ChampionAdditionalFilterOptions {
  raceOptions: string[]
  genderOptions: string[]
  alignmentOptions: string[]
  professionOptions: string[]
  acquisitionOptions: string[]
  mechanicOptionGroups: MechanicOptionGroup[]
}

interface ChampionAdditionalFilterUiState {
  identitySelectedCount: number
  metaSelectedCount: number
  isIdentityExpanded: boolean
  isMetaExpanded: boolean
}

interface ChampionAdditionalFilterActions {
  toggleIdentityExpanded: () => void
  toggleMetaExpanded: () => void
  resetRace: () => void
  toggleRace: (value: string) => void
  resetGender: () => void
  toggleGender: (value: string) => void
  resetAlignment: () => void
  toggleAlignment: (value: string) => void
  resetProfession: () => void
  toggleProfession: (value: string) => void
  resetAcquisition: () => void
  toggleAcquisition: (value: string) => void
  resetMechanic: () => void
  toggleMechanic: (value: string) => void
}

interface ChampionAdditionalFilterSectionsProps {
  locale: AppLocale
  t: (text: LocaleText) => string
  copy: ChampionAdditionalFilterCopy
  values: ChampionAdditionalFilterValues
  options: ChampionAdditionalFilterOptions
  ui: ChampionAdditionalFilterUiState
  actions: ChampionAdditionalFilterActions
  mechanicGroupHint: (groupId: MechanicOptionGroup['id']) => ReactNode
}

function buildSectionStatus(selectedCount: number, t: (text: LocaleText) => string): string {
  return selectedCount > 0
    ? t({ zh: `已选 ${selectedCount}`, en: `${selectedCount} selected` })
    : t({ zh: '默认收起', en: 'Folded' })
}

export function ChampionAdditionalFilterSections({
  locale,
  t,
  copy,
  values,
  options,
  ui,
  actions,
  mechanicGroupHint,
}: ChampionAdditionalFilterSectionsProps) {
  const groups: FilterSidebarGroupSchema[] = [
    {
      kind: 'disclosure-group',
      id: 'additional',
      label: t({ zh: '补充筛选', en: 'Additional filters' }),
      sections: [
        {
          id: 'identity',
          title: t({ zh: '身份画像', en: 'Identity' }),
          summary: t({ zh: '种族 / 性别 / 阵营', en: 'Race / gender / alignment' }),
          status: buildSectionStatus(ui.identitySelectedCount, t),
          isExpanded: ui.isIdentityExpanded,
          onToggle: actions.toggleIdentityExpanded,
          fields: [
            {
              kind: 'chip-multi',
              id: 'races',
              label: getChampionAttributeGroupLabel('race', locale),
              hint: t(copy.raceHint),
              options: options.raceOptions.map((race) => ({
                id: race,
                label: getChampionTagLabel(race, locale),
              })),
              selectedValues: values.selectedRaces,
              allLabel: t({ zh: '全部', en: 'All' }),
              onReset: actions.resetRace,
              onToggle: (value) => actions.toggleRace(String(value)),
            },
            {
              kind: 'chip-multi',
              id: 'genders',
              label: getChampionAttributeGroupLabel('gender', locale),
              hint: t(copy.genderHint),
              options: options.genderOptions.map((gender) => ({
                id: gender,
                label: getChampionTagLabel(gender, locale),
              })),
              selectedValues: values.selectedGenders,
              allLabel: t({ zh: '全部', en: 'All' }),
              onReset: actions.resetGender,
              onToggle: (value) => actions.toggleGender(String(value)),
            },
            {
              kind: 'chip-multi',
              id: 'alignments',
              label: getChampionAttributeGroupLabel('alignment', locale),
              hint: t(copy.alignmentHint),
              options: options.alignmentOptions.map((alignment) => ({
                id: alignment,
                label: getChampionTagLabel(alignment, locale),
              })),
              selectedValues: values.selectedAlignments,
              allLabel: t({ zh: '全部', en: 'All' }),
              onReset: actions.resetAlignment,
              onToggle: (value) => actions.toggleAlignment(String(value)),
            },
          ],
        },
        {
          id: 'meta',
          title: t(copy.metaTitle),
          summary: t(copy.metaSummary),
          status: buildSectionStatus(ui.metaSelectedCount, t),
          isExpanded: ui.isMetaExpanded,
          onToggle: actions.toggleMetaExpanded,
          fields: [
            {
              kind: 'chip-multi',
              id: 'professions',
              label: getChampionAttributeGroupLabel('profession', locale),
              hint: t(copy.professionHint),
              options: options.professionOptions.map((profession) => ({
                id: profession,
                label: getChampionTagLabel(profession, locale),
              })),
              selectedValues: values.selectedProfessions,
              allLabel: t({ zh: '全部', en: 'All' }),
              onReset: actions.resetProfession,
              onToggle: (value) => actions.toggleProfession(String(value)),
            },
            {
              kind: 'chip-multi',
              id: 'acquisitions',
              label: getChampionAttributeGroupLabel('acquisition', locale),
              hint: t(copy.acquisitionHint),
              options: options.acquisitionOptions.map((acquisition) => ({
                id: acquisition,
                label: getChampionTagLabel(acquisition, locale),
              })),
              selectedValues: values.selectedAcquisitions,
              allLabel: t({ zh: '全部', en: 'All' }),
              onReset: actions.resetAcquisition,
              onToggle: (value) => actions.toggleAcquisition(String(value)),
            },
            {
              kind: 'custom',
              id: 'mechanics',
              render: () => (
                <MechanicFilterFieldGroup
                  locale={locale}
                  label={getChampionAttributeGroupLabel('mechanics', locale)}
                  hint={t(copy.mechanicHint)}
                  groups={options.mechanicOptionGroups}
                  selectedValues={values.selectedMechanics}
                  allLabel={t({ zh: '全部', en: 'All' })}
                  onReset={actions.resetMechanic}
                  onToggle={actions.toggleMechanic}
                  groupHint={mechanicGroupHint}
                />
              ),
            },
          ],
        },
      ],
    },
  ]

  return <FilterSidebarSchemaRenderer groups={groups} />
}
