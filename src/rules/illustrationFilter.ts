import { matchesLocalizedText } from '../domain/localizedText'
import type { Champion, ChampionIllustration, ChampionIllustrationKind } from '../domain/types'
import type { ChampionFilters } from './championFilter'

export interface FilterableIllustration {
  illustration: ChampionIllustration
  champion: Champion | null
}

export interface IllustrationFilters extends ChampionFilters {
  kinds: ChampionIllustrationKind[]
}

function matchesIllustrationSearch(entry: FilterableIllustration, query: string): boolean {
  if (!query) {
    return true
  }

  const { champion, illustration } = entry

  return (
    matchesLocalizedText(illustration.championName, query) ||
    matchesLocalizedText(illustration.illustrationName, query) ||
    illustration.sourceGraphicId.toLowerCase().includes(query) ||
    illustration.sourceGraphic.toLowerCase().includes(query) ||
    (champion !== null &&
      (matchesLocalizedText(champion.name, query) ||
        champion.roles.some((role) => role.toLowerCase().includes(query)) ||
        champion.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        champion.affiliations.some((affiliation) => matchesLocalizedText(affiliation, query))))
  )
}

export function filterIllustrations(
  entries: FilterableIllustration[],
  filters: IllustrationFilters,
): FilterableIllustration[] {
  const query = filters.search.trim().toLowerCase()

  return entries.filter((entry) => {
    const { champion, illustration } = entry
    const matchesSearch = matchesIllustrationSearch(entry, query)
    const matchesSeat = filters.seats.length === 0 || filters.seats.includes(illustration.seat)
    const matchesKind = filters.kinds.length === 0 || filters.kinds.includes(illustration.kind)
    const matchesRole =
      filters.roles.length === 0 || (champion !== null && filters.roles.some((role) => champion.roles.includes(role)))
    const matchesAffiliation =
      filters.affiliations.length === 0 ||
      (champion !== null &&
        filters.affiliations.some((selectedAffiliation) =>
          champion.affiliations.some((affiliation) => affiliation.original === selectedAffiliation),
        ))
    const matchesRace =
      filters.races.length === 0 || (champion !== null && filters.races.some((race) => champion.tags.includes(race)))
    const matchesGender =
      filters.genders.length === 0 ||
      (champion !== null && filters.genders.some((gender) => champion.tags.includes(gender)))
    const matchesProfession =
      filters.professions.length === 0 ||
      (champion !== null && filters.professions.some((profession) => champion.tags.includes(profession)))
    const matchesAlignment =
      filters.alignments.length === 0 ||
      (champion !== null && filters.alignments.some((alignment) => champion.tags.includes(alignment)))
    const matchesAcquisition =
      filters.acquisitions.length === 0 ||
      (champion !== null && filters.acquisitions.some((acquisition) => champion.tags.includes(acquisition)))
    const matchesMechanic =
      filters.mechanics.length === 0 ||
      (champion !== null && filters.mechanics.some((mechanic) => champion.tags.includes(mechanic)))

    return (
      matchesSearch &&
      matchesSeat &&
      matchesKind &&
      matchesRole &&
      matchesAffiliation &&
      matchesRace &&
      matchesGender &&
      matchesProfession &&
      matchesAlignment &&
      matchesAcquisition &&
      matchesMechanic
    )
  })
}
