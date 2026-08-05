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
  if (query === '') {
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

/**
 * 公共模式：过滤值为空 → 通过；否则需要 champion 非空且至少一项命中。
 * 收口 champion null 守卫与空过滤短路，避免每个 tag 类过滤各写一次。
 */
function matchesChampionFilter(
  champion: Champion | null,
  filterValues: readonly string[],
  predicate: (champion: Champion, value: string) => boolean,
): boolean {
  if (filterValues.length === 0) {
    return true
  }
  if (champion === null) {
    return false
  }
  return filterValues.some((value) => predicate(champion, value))
}

function matchesAllIllustrationFilters(
  entry: FilterableIllustration,
  filters: IllustrationFilters,
  query: string,
): boolean {
  const { champion, illustration } = entry
  const matchesSearch = matchesIllustrationSearch(entry, query)
  const matchesSeat = filters.seats.length === 0 || filters.seats.includes(illustration.seat)
  const matchesKind = filters.kinds.length === 0 || filters.kinds.includes(illustration.kind)
  const matchesRole = matchesChampionFilter(champion, filters.roles, (c, role) => c.roles.includes(role))
  const matchesAffiliation = matchesChampionFilter(champion, filters.affiliations, (c, selected) =>
    c.affiliations.some((affiliation) => affiliation.original === selected),
  )
  const matchesRace = matchesChampionFilter(champion, filters.races, (c, race) => c.tags.includes(race))
  const matchesGender = matchesChampionFilter(champion, filters.genders, (c, gender) => c.tags.includes(gender))
  const matchesProfession = matchesChampionFilter(champion, filters.professions, (c, profession) =>
    c.tags.includes(profession),
  )
  const matchesAlignment = matchesChampionFilter(champion, filters.alignments, (c, alignment) =>
    c.tags.includes(alignment),
  )
  const matchesAcquisition = matchesChampionFilter(champion, filters.acquisitions, (c, acquisition) =>
    c.tags.includes(acquisition),
  )
  const matchesMechanic = matchesChampionFilter(champion, filters.mechanics, (c, mechanic) =>
    c.tags.includes(mechanic),
  )

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
}

export function filterIllustrations(
  entries: FilterableIllustration[],
  filters: IllustrationFilters,
): FilterableIllustration[] {
  const query = filters.search.trim().toLowerCase()

  return entries.filter((entry) => matchesAllIllustrationFilters(entry, filters, query))
}
