import { matchesLocalizedText } from '../domain/localizedText'
import type { Champion } from '../domain/types'

export interface ChampionFilters {
  search: string
  seats: number[]
  roles: string[]
  affiliations: string[]
}

export function toggleFilterValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export function filterChampions(champions: Champion[], filters: ChampionFilters): Champion[] {
  const query = filters.search.trim().toLowerCase()

  return champions.filter((champion) => {
    const matchesSearch =
      !query ||
      matchesLocalizedText(champion.name, query) ||
      champion.tags.some((tag) => tag.toLowerCase().includes(query)) ||
      champion.affiliations.some((affiliation) => matchesLocalizedText(affiliation, query))

    const matchesSeat = filters.seats.length === 0 || filters.seats.includes(champion.seat)
    const matchesRole = filters.roles.length === 0 || filters.roles.some((role) => champion.roles.includes(role))
    const matchesAffiliation =
      filters.affiliations.length === 0 ||
      filters.affiliations.some((selectedAffiliation) =>
        champion.affiliations.some((affiliation) => affiliation.original === selectedAffiliation),
      )

    return matchesSearch && matchesSeat && matchesRole && matchesAffiliation
  })
}
