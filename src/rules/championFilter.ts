import { matchesLocalizedText } from '../domain/localizedText'
import type { Champion } from '../domain/types'

export interface ChampionFilters {
  search: string
  seats: number[]
  roles: string[]
  affiliations: string[]
  races: string[]
  genders: string[]
  professions: string[]
  alignments: string[]
  acquisitions: string[]
  mechanics: string[]
  patrons: string[]
}

/**
 * 公共模式：过滤值为空 → 通过；否则至少一项命中。
 * 收口空过滤短路，避免每个 tag 类过滤各写一次 length === 0 || some。
 */
function matchesTagFilter(
  filterValues: readonly string[],
  predicate: (value: string) => boolean,
): boolean {
  if (filterValues.length === 0) {
    return true
  }
  return filterValues.some(predicate)
}

function matchesAllChampionFilters(champion: Champion, filters: ChampionFilters, query: string): boolean {
  const matchesSearch =
    query === '' ||
    matchesLocalizedText(champion.name, query) ||
    champion.tags.some((tag) => tag.toLowerCase().includes(query)) ||
    champion.affiliations.some((affiliation) => matchesLocalizedText(affiliation, query))

  const matchesSeat = filters.seats.length === 0 || filters.seats.includes(champion.seat)
  const matchesRole = matchesTagFilter(filters.roles, (role) => champion.roles.includes(role))
  const matchesAffiliation = matchesTagFilter(filters.affiliations, (selected) =>
    champion.affiliations.some((affiliation) => affiliation.original === selected),
  )
  const matchesRace = matchesTagFilter(filters.races, (race) => champion.tags.includes(race))
  const matchesGender = matchesTagFilter(filters.genders, (gender) => champion.tags.includes(gender))
  const matchesProfession = matchesTagFilter(filters.professions, (profession) => champion.tags.includes(profession))
  const matchesAlignment = matchesTagFilter(filters.alignments, (alignment) => champion.tags.includes(alignment))
  const matchesAcquisition = matchesTagFilter(filters.acquisitions, (acquisition) => champion.tags.includes(acquisition))
  const matchesMechanic = matchesTagFilter(filters.mechanics, (mechanic) => champion.tags.includes(mechanic))
  const matchesPatron = matchesTagFilter(filters.patrons, (patronId) =>
    (champion.patronEligibility?.eligiblePatronIds ?? []).includes(patronId),
  )

  return (
    matchesSearch &&
    matchesSeat &&
    matchesRole &&
    matchesAffiliation &&
    matchesRace &&
    matchesGender &&
    matchesProfession &&
    matchesAlignment &&
    matchesAcquisition &&
    matchesMechanic &&
    matchesPatron
  )
}

export function filterChampions(champions: Champion[], filters: ChampionFilters): Champion[] {
  const query = filters.search.trim().toLowerCase()

  return champions.filter((champion) => matchesAllChampionFilters(champion, filters, query))
}
