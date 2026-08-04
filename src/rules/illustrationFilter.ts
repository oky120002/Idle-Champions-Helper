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

function matchesIllustrationFields(illustration: ChampionIllustration, query: string): boolean {
  return (
    matchesLocalizedText(illustration.championName, query) ||
    matchesLocalizedText(illustration.illustrationName, query) ||
    illustration.sourceGraphicId.toLowerCase().includes(query) ||
    illustration.sourceGraphic.toLowerCase().includes(query)
  )
}

function matchesChampionFields(champion: Champion, query: string): boolean {
  return (
    matchesLocalizedText(champion.name, query) ||
    champion.roles.some((role) => role.toLowerCase().includes(query)) ||
    champion.tags.some((tag) => tag.toLowerCase().includes(query)) ||
    champion.affiliations.some((affiliation) => matchesLocalizedText(affiliation, query))
  )
}

function matchesIllustrationSearch(entry: FilterableIllustration, query: string): boolean {
  if (!query) return true
  const { champion, illustration } = entry
  if (matchesIllustrationFields(illustration, query)) return true
  return champion !== null && matchesChampionFields(champion, query)
}

function matchesSelectedDimension(
  champion: Champion | null,
  selected: string[],
  hasValue: (champion: Champion, value: string) => boolean,
): boolean {
  if (selected.length === 0) return true
  if (champion === null) return false
  return selected.some((value) => hasValue(champion, value))
}

export function filterIllustrations(
  entries: FilterableIllustration[],
  filters: IllustrationFilters,
): FilterableIllustration[] {
  const query = filters.search.trim().toLowerCase()

  return entries.filter((entry) => {
    const { champion, illustration } = entry
    return [
      matchesIllustrationSearch(entry, query),
      filters.seats.length === 0 || filters.seats.includes(illustration.seat),
      filters.kinds.length === 0 || filters.kinds.includes(illustration.kind),
      matchesSelectedDimension(champion, filters.roles, (c, role) => c.roles.includes(role)),
      matchesSelectedDimension(champion, filters.affiliations, (c, selected) =>
        c.affiliations.some((a) => a.original === selected)),
      matchesSelectedDimension(champion, filters.races, (c, race) => c.tags.includes(race)),
      matchesSelectedDimension(champion, filters.genders, (c, gender) => c.tags.includes(gender)),
      matchesSelectedDimension(champion, filters.professions, (c, profession) => c.tags.includes(profession)),
      matchesSelectedDimension(champion, filters.alignments, (c, alignment) => c.tags.includes(alignment)),
      matchesSelectedDimension(champion, filters.acquisitions, (c, acquisition) => c.tags.includes(acquisition)),
      matchesSelectedDimension(champion, filters.mechanics, (c, mechanic) => c.tags.includes(mechanic)),
    ].every(Boolean)
  })
}
