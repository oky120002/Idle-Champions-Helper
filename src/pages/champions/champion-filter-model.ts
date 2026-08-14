import { formatSeatLabel, getLocalizedTextPair, getRoleLabel } from '../../domain/localizedText'
import { getChampionTagLabel } from '../../domain/champion-tags/selectors'
import type { ActiveFilterChip, IdLocalizedOption } from '../../features/champion-filters/types'
import type { AppLocale } from '../../app/i18n'
import { selectLocaleText as pickText, t } from '../../app/i18n-messages'
import type { ChampionsFilterState } from './types'

interface ActiveChipOptions {
  locale: AppLocale
  filters: ChampionsFilterState
  orderedSelectedSeats: number[]
  orderedSelectedRoles: string[]
  orderedSelectedAffiliations: Array<{ original: string; display: string }>
  orderedSelectedRaces: string[]
  orderedSelectedGenders: string[]
  orderedSelectedAlignments: string[]
  orderedSelectedProfessions: string[]
  orderedSelectedAcquisitions: string[]
  orderedSelectedMechanics: string[]
  orderedSelectedPatrons: IdLocalizedOption[]
}

export function buildChampionsTransitionKey(filters: ChampionsFilterState): string {
  return JSON.stringify(filters)
}

export function buildActiveFilterChips({
  locale,
  filters,
  orderedSelectedSeats,
  orderedSelectedRoles,
  orderedSelectedAffiliations,
  orderedSelectedRaces,
  orderedSelectedGenders,
  orderedSelectedAlignments,
  orderedSelectedProfessions,
  orderedSelectedAcquisitions,
  orderedSelectedMechanics,
  orderedSelectedPatrons,
}: ActiveChipOptions): ActiveFilterChip[] {
  const trimmedSearch = filters.search.trim()
  const patronLabels = orderedSelectedPatrons.map((patron) => getLocalizedTextPair(patron, locale))

  return [
    trimmedSearch !== ''
      ? {
          id: 'search',
          label: t(locale, '关键词：{p0}', { p0: trimmedSearch }),
          clearLabel: t(locale, '清空关键词：{p0}', { p0: trimmedSearch }),
        }
      : null,
    orderedSelectedSeats.length > 0
      ? {
          id: 'seats',
          label: pickText(locale, `座位：${orderedSelectedSeats.map((seat) => formatSeatLabel(seat, locale)).join('、')}`, `Seats: ${orderedSelectedSeats.join(', ')}`),
          clearLabel: pickText(locale, `清空座位：${orderedSelectedSeats.map((seat) => formatSeatLabel(seat, locale)).join('、')}`, `Clear seats: ${orderedSelectedSeats.join(', ')}`),
        }
      : null,
    orderedSelectedRoles.length > 0
      ? {
          id: 'roles',
          label: pickText(locale, `定位：${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join('、')}`, `Roles: ${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join(', ')}`),
          clearLabel: pickText(locale, `清空定位：${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join('、')}`, `Clear roles: ${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join(', ')}`),
        }
      : null,
    orderedSelectedAffiliations.length > 0
      ? {
          id: 'affiliations',
          label: pickText(locale, `联动队伍：${orderedSelectedAffiliations.map((affiliation) => getLocalizedTextPair(affiliation, locale)).join('、')}`, `Affiliations: ${orderedSelectedAffiliations
              .map((affiliation) => getLocalizedTextPair(affiliation, locale))
              .join(', ')}`),
          clearLabel: pickText(locale, `清空联动队伍：${orderedSelectedAffiliations.map((affiliation) => getLocalizedTextPair(affiliation, locale)).join('、')}`, `Clear affiliations: ${orderedSelectedAffiliations
              .map((affiliation) => getLocalizedTextPair(affiliation, locale))
              .join(', ')}`),
        }
      : null,
    orderedSelectedRaces.length > 0
      ? {
          id: 'races',
          label: pickText(locale, `种族：${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join('、')}`, `Races: ${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join(', ')}`),
          clearLabel: pickText(locale, `清空种族：${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join('、')}`, `Clear races: ${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join(', ')}`),
        }
      : null,
    orderedSelectedGenders.length > 0
      ? {
          id: 'genders',
          label: pickText(locale, `性别：${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join('、')}`, `Genders: ${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join(', ')}`),
          clearLabel: pickText(locale, `清空性别：${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join('、')}`, `Clear genders: ${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join(', ')}`),
        }
      : null,
    orderedSelectedAlignments.length > 0
      ? {
          id: 'alignments',
          label: pickText(locale, `阵营：${orderedSelectedAlignments.map((alignment) => getChampionTagLabel(alignment, locale)).join('、')}`, `Alignments: ${orderedSelectedAlignments.map((alignment) => getChampionTagLabel(alignment, locale)).join(', ')}`),
          clearLabel: pickText(locale, `清空阵营：${orderedSelectedAlignments.map((alignment) => getChampionTagLabel(alignment, locale)).join('、')}`, `Clear alignments: ${orderedSelectedAlignments.map((alignment) => getChampionTagLabel(alignment, locale)).join(', ')}`),
        }
      : null,
    orderedSelectedProfessions.length > 0
      ? {
          id: 'professions',
          label: pickText(locale, `职业：${orderedSelectedProfessions.map((profession) => getChampionTagLabel(profession, locale)).join('、')}`, `Professions: ${orderedSelectedProfessions
              .map((profession) => getChampionTagLabel(profession, locale))
              .join(', ')}`),
          clearLabel: pickText(locale, `清空职业：${orderedSelectedProfessions.map((profession) => getChampionTagLabel(profession, locale)).join('、')}`, `Clear professions: ${orderedSelectedProfessions
              .map((profession) => getChampionTagLabel(profession, locale))
              .join(', ')}`),
        }
      : null,
    orderedSelectedAcquisitions.length > 0
      ? {
          id: 'acquisitions',
          label: pickText(locale, `获取方式：${orderedSelectedAcquisitions.map((acquisition) => getChampionTagLabel(acquisition, locale)).join('、')}`, `Availability: ${orderedSelectedAcquisitions
              .map((acquisition) => getChampionTagLabel(acquisition, locale))
              .join(', ')}`),
          clearLabel: pickText(locale, `清空获取方式：${orderedSelectedAcquisitions.map((acquisition) => getChampionTagLabel(acquisition, locale)).join('、')}`, `Clear availability: ${orderedSelectedAcquisitions
              .map((acquisition) => getChampionTagLabel(acquisition, locale))
              .join(', ')}`),
        }
      : null,
    orderedSelectedMechanics.length > 0
      ? {
          id: 'mechanics',
          label: pickText(locale, `特殊机制：${orderedSelectedMechanics.map((mechanic) => getChampionTagLabel(mechanic, locale)).join('、')}`, `Special mechanics: ${orderedSelectedMechanics
              .map((mechanic) => getChampionTagLabel(mechanic, locale))
              .join(', ')}`),
          clearLabel: pickText(locale, `清空特殊机制：${orderedSelectedMechanics.map((mechanic) => getChampionTagLabel(mechanic, locale)).join('、')}`, `Clear special mechanics: ${orderedSelectedMechanics
              .map((mechanic) => getChampionTagLabel(mechanic, locale))
              .join(', ')}`),
        }
      : null,
    orderedSelectedPatrons.length > 0
      ? {
          id: 'patrons',
          label: pickText(locale, `赞助人：${patronLabels.join('、')}`, `Patrons: ${patronLabels.join(', ')}`),
          clearLabel: pickText(locale, `清空赞助人：${patronLabels.join('、')}`, `Clear patrons: ${patronLabels.join(', ')}`),
        }
      : null,
  ].filter((item): item is ActiveFilterChip => Boolean(item))
}
