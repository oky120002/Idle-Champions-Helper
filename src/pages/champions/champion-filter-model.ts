import { formatSeatLabel, getLocalizedTextPair, getRoleLabel } from '../../domain/localizedText'
import { getChampionTagLabel } from '../../domain/championTags'
import type { ActiveFilterChip } from '../../features/champion-filters/types'
import type { AppLocale } from '../../app/i18n'
import type { ChampionsPageTranslator, ChampionsFilterState } from './types'

interface ActiveChipOptions {
  locale: AppLocale
  t: ChampionsPageTranslator
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
}

export function buildChampionsTransitionKey(filters: ChampionsFilterState): string {
  return JSON.stringify(filters)
}

export function buildActiveFilterChips({
  locale,
  t,
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
}: ActiveChipOptions): ActiveFilterChip[] {
  const trimmedSearch = filters.search.trim()

  return [
    trimmedSearch
      ? {
          id: 'search',
          label: t({ zh: `关键词：${trimmedSearch}`, en: `Keyword: ${trimmedSearch}` }),
          clearLabel: t({ zh: `清空关键词：${trimmedSearch}`, en: `Clear keyword: ${trimmedSearch}` }),
        }
      : null,
    orderedSelectedSeats.length > 0
      ? {
          id: 'seats',
          label: t({
            zh: `座位：${orderedSelectedSeats.map((seat) => formatSeatLabel(seat, locale)).join('、')}`,
            en: `Seats: ${orderedSelectedSeats.join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空座位：${orderedSelectedSeats.map((seat) => formatSeatLabel(seat, locale)).join('、')}`,
            en: `Clear seats: ${orderedSelectedSeats.join(', ')}`,
          }),
        }
      : null,
    orderedSelectedRoles.length > 0
      ? {
          id: 'roles',
          label: t({
            zh: `定位：${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join('、')}`,
            en: `Roles: ${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空定位：${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join('、')}`,
            en: `Clear roles: ${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join(', ')}`,
          }),
        }
      : null,
    orderedSelectedAffiliations.length > 0
      ? {
          id: 'affiliations',
          label: t({
            zh: `联动队伍：${orderedSelectedAffiliations.map((affiliation) => getLocalizedTextPair(affiliation, locale)).join('、')}`,
            en: `Affiliations: ${orderedSelectedAffiliations
              .map((affiliation) => getLocalizedTextPair(affiliation, locale))
              .join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空联动队伍：${orderedSelectedAffiliations.map((affiliation) => getLocalizedTextPair(affiliation, locale)).join('、')}`,
            en: `Clear affiliations: ${orderedSelectedAffiliations
              .map((affiliation) => getLocalizedTextPair(affiliation, locale))
              .join(', ')}`,
          }),
        }
      : null,
    orderedSelectedRaces.length > 0
      ? {
          id: 'races',
          label: t({
            zh: `种族：${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join('、')}`,
            en: `Races: ${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空种族：${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join('、')}`,
            en: `Clear races: ${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join(', ')}`,
          }),
        }
      : null,
    orderedSelectedGenders.length > 0
      ? {
          id: 'genders',
          label: t({
            zh: `性别：${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join('、')}`,
            en: `Genders: ${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空性别：${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join('、')}`,
            en: `Clear genders: ${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join(', ')}`,
          }),
        }
      : null,
    orderedSelectedAlignments.length > 0
      ? {
          id: 'alignments',
          label: t({
            zh: `阵营：${orderedSelectedAlignments.map((alignment) => getChampionTagLabel(alignment, locale)).join('、')}`,
            en: `Alignments: ${orderedSelectedAlignments.map((alignment) => getChampionTagLabel(alignment, locale)).join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空阵营：${orderedSelectedAlignments.map((alignment) => getChampionTagLabel(alignment, locale)).join('、')}`,
            en: `Clear alignments: ${orderedSelectedAlignments.map((alignment) => getChampionTagLabel(alignment, locale)).join(', ')}`,
          }),
        }
      : null,
    orderedSelectedProfessions.length > 0
      ? {
          id: 'professions',
          label: t({
            zh: `职业：${orderedSelectedProfessions.map((profession) => getChampionTagLabel(profession, locale)).join('、')}`,
            en: `Professions: ${orderedSelectedProfessions
              .map((profession) => getChampionTagLabel(profession, locale))
              .join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空职业：${orderedSelectedProfessions.map((profession) => getChampionTagLabel(profession, locale)).join('、')}`,
            en: `Clear professions: ${orderedSelectedProfessions
              .map((profession) => getChampionTagLabel(profession, locale))
              .join(', ')}`,
          }),
        }
      : null,
    orderedSelectedAcquisitions.length > 0
      ? {
          id: 'acquisitions',
          label: t({
            zh: `获取方式：${orderedSelectedAcquisitions.map((acquisition) => getChampionTagLabel(acquisition, locale)).join('、')}`,
            en: `Availability: ${orderedSelectedAcquisitions
              .map((acquisition) => getChampionTagLabel(acquisition, locale))
              .join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空获取方式：${orderedSelectedAcquisitions.map((acquisition) => getChampionTagLabel(acquisition, locale)).join('、')}`,
            en: `Clear availability: ${orderedSelectedAcquisitions
              .map((acquisition) => getChampionTagLabel(acquisition, locale))
              .join(', ')}`,
          }),
        }
      : null,
    orderedSelectedMechanics.length > 0
      ? {
          id: 'mechanics',
          label: t({
            zh: `特殊机制：${orderedSelectedMechanics.map((mechanic) => getChampionTagLabel(mechanic, locale)).join('、')}`,
            en: `Special mechanics: ${orderedSelectedMechanics
              .map((mechanic) => getChampionTagLabel(mechanic, locale))
              .join(', ')}`,
          }),
          clearLabel: t({
            zh: `清空特殊机制：${orderedSelectedMechanics.map((mechanic) => getChampionTagLabel(mechanic, locale)).join('、')}`,
            en: `Clear special mechanics: ${orderedSelectedMechanics
              .map((mechanic) => getChampionTagLabel(mechanic, locale))
              .join(', ')}`,
          }),
        }
      : null,
  ].filter((item): item is ActiveFilterChip => Boolean(item))
}
