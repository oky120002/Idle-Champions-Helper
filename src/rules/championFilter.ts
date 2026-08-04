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
}

function matchesChampionSearch(champion: Champion, query: string): boolean {
  if (!query) return true
  return (
    matchesLocalizedText(champion.name, query) ||
    champion.tags.some((tag) => tag.toLowerCase().includes(query)) ||
    champion.affiliations.some((affiliation) => matchesLocalizedText(affiliation, query))
  )
}

export function filterChampions(champions: Champion[], filters: ChampionFilters): Champion[] {
  const query = filters.search.trim().toLowerCase()

  return champions.filter((champion) => {
    const matchesAffiliation =
      filters.affiliations.length === 0 ||
      filters.affiliations.some((selectedAffiliation) =>
        champion.affiliations.some((affiliation) => affiliation.original === selectedAffiliation),
      )

    return [
      matchesChampionSearch(champion, query),
      filters.seats.length === 0 || filters.seats.includes(champion.seat),
      filters.roles.length === 0 || filters.roles.some((role) => champion.roles.includes(role)),
      matchesAffiliation,
      filters.races.length === 0 || filters.races.some((race) => champion.tags.includes(race)),
      filters.genders.length === 0 || filters.genders.some((gender) => champion.tags.includes(gender)),
      filters.professions.length === 0 || filters.professions.some((profession) => champion.tags.includes(profession)),
      filters.alignments.length === 0 || filters.alignments.some((alignment) => champion.tags.includes(alignment)),
      filters.acquisitions.length === 0 || filters.acquisitions.some((acquisition) => champion.tags.includes(acquisition)),
      filters.mechanics.length === 0 || filters.mechanics.some((mechanic) => champion.tags.includes(mechanic)),
    ].every(Boolean)
  })
}
