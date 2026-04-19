import { formatSeatLabel, getPrimaryLocalizedText, getRoleLabel } from '../../domain/localizedText'
import { getChampionTagLabel } from '../../domain/championTags'
import type { Champion, ChampionIllustration, ChampionIllustrationKind, LocalizedText } from '../../domain/types'
import type { ActiveFilterChip } from '../../features/champion-filters/types'
import type { FilterableIllustration } from '../../rules/illustrationFilter'
import type { IllustrationsFilterState, IllustrationsPageTranslator, ViewFilter } from './types'

export function buildIllustrationEntries(
  illustrations: ChampionIllustration[],
  championMap: ReadonlyMap<string, Champion>,
): FilterableIllustration[] {
  return illustrations.map((illustration) => ({
    illustration,
    champion: championMap.get(illustration.championId) ?? null,
  }))
}

export function countIllustrationsByKind(illustrations: ChampionIllustration[]): {
  totalHeroCount: number
  totalSkinCount: number
} {
  const totalHeroCount = illustrations.filter((illustration) => illustration.kind === 'hero-base').length

  return {
    totalHeroCount,
    totalSkinCount: illustrations.length - totalHeroCount,
  }
}

export function countIllustrationEntriesByKind(entries: FilterableIllustration[]): {
  totalHeroCount: number
  totalSkinCount: number
} {
  const totalHeroCount = entries.filter(({ illustration }) => illustration.kind === 'hero-base').length

  return {
    totalHeroCount,
    totalSkinCount: entries.length - totalHeroCount,
  }
}

function createSeededRandom(seed: number) {
  let value = seed || 1

  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

export function shuffleIllustrationEntries(entries: FilterableIllustration[], seed: number): FilterableIllustration[] {
  const nextEntries = entries.slice()
  const random = createSeededRandom(seed)

  for (let index = nextEntries.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = nextEntries[index]
    const swap = nextEntries[swapIndex]

    if (!current || !swap) {
      continue
    }

    nextEntries[index] = swap
    nextEntries[swapIndex] = current
  }

  return nextEntries
}

export function hasActiveIllustrationFilters(filters: IllustrationsFilterState): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.scope !== 'all' ||
    filters.selectedSeats.length > 0 ||
    filters.selectedRoles.length > 0 ||
    filters.selectedAffiliations.length > 0 ||
    filters.selectedRaces.length > 0 ||
    filters.selectedGenders.length > 0 ||
    filters.selectedAlignments.length > 0 ||
    filters.selectedProfessions.length > 0 ||
    filters.selectedAcquisitions.length > 0 ||
    filters.selectedMechanics.length > 0
  )
}

export function buildIllustrationAlt(illustration: ChampionIllustration, locale: 'zh-CN' | 'en-US'): string {
  const championName = getPrimaryLocalizedText(illustration.championName, locale)
  const illustrationName = getPrimaryLocalizedText(illustration.illustrationName, locale)

  if (illustration.kind === 'hero-base') {
    return locale === 'zh-CN' ? `${championName}本体立绘` : `${championName} base illustration`
  }

  return locale === 'zh-CN'
    ? `${championName}${illustrationName}皮肤立绘`
    : `${championName} ${illustrationName} skin illustration`
}

export function buildIllustrationCardTitle(
  illustration: Pick<ChampionIllustration, 'championName' | 'illustrationName' | 'kind'>,
  locale: 'zh-CN' | 'en-US',
): { primary: string; secondary: string | null; text: string } {
  const championName = getPrimaryLocalizedText(illustration.championName, locale)
  const illustrationName = getPrimaryLocalizedText(illustration.illustrationName, locale)
  const secondary = illustration.kind === 'skin' && illustrationName !== championName ? championName : null

  return {
    primary: illustrationName,
    secondary,
    text: secondary ? `${illustrationName} · ${secondary}` : illustrationName,
  }
}

export function buildKindLabel(kind: ChampionIllustrationKind, locale: 'zh-CN' | 'en-US'): string {
  if (kind === 'hero-base') {
    return locale === 'zh-CN' ? '本体' : 'Base'
  }

  return locale === 'zh-CN' ? '皮肤' : 'Skin'
}

export function buildViewFilterLabel(view: ViewFilter, locale: 'zh-CN' | 'en-US'): string {
  if (view === 'all') {
    return locale === 'zh-CN' ? '全部' : 'All'
  }

  return buildKindLabel(view, locale)
}

export function buildSourceSlotLabel(slot: ChampionIllustration['sourceSlot'], locale: 'zh-CN' | 'en-US'): string {
  if (slot === 'large') {
    return locale === 'zh-CN' ? '来源 large 槽位' : 'Source: large slot'
  }

  if (slot === 'xl') {
    return locale === 'zh-CN' ? '来源 xl 槽位' : 'Source: xl slot'
  }

  return locale === 'zh-CN' ? '来源 base 槽位' : 'Source: base slot'
}

type BuildActiveFilterChipsOptions = {
  locale: 'zh-CN' | 'en-US'
  t: IllustrationsPageTranslator
  filters: IllustrationsFilterState
  orderedSelectedSeats: number[]
  orderedSelectedRoles: string[]
  orderedSelectedAffiliations: LocalizedText[]
  orderedSelectedRaces: string[]
  orderedSelectedGenders: string[]
  orderedSelectedAlignments: string[]
  orderedSelectedProfessions: string[]
  orderedSelectedAcquisitions: string[]
  orderedSelectedMechanics: string[]
}

export function buildActiveIllustrationFilterChips({
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
}: BuildActiveFilterChipsOptions): ActiveFilterChip[] {
  const trimmedSearch = filters.search.trim()

  return [
    trimmedSearch
      ? {
          id: 'search',
          label: t({ zh: `关键词：${trimmedSearch}`, en: `Keyword: ${trimmedSearch}` }),
          clearLabel: t({ zh: `清空关键词：${trimmedSearch}`, en: `Clear keyword: ${trimmedSearch}` }),
        }
      : null,
    filters.scope !== 'all'
      ? {
          id: 'view',
          label: t({
            zh: `范围：${buildViewFilterLabel(filters.scope, locale)}`,
            en: `Scope: ${buildViewFilterLabel(filters.scope, locale)}`,
          }),
          clearLabel: t({
            zh: `清空范围筛选：${buildViewFilterLabel(filters.scope, locale)}`,
            en: `Clear scope filter: ${buildViewFilterLabel(filters.scope, locale)}`,
          }),
        }
      : null,
    orderedSelectedSeats.length > 0
      ? {
          id: 'seats',
          label: t({
            zh: `座位：${orderedSelectedSeats.map((seat) => formatSeatLabel(seat, locale)).join(' / ')}`,
            en: `Seat: ${orderedSelectedSeats.map((seat) => formatSeatLabel(seat, locale)).join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空座位筛选', en: 'Clear seat filter' }),
        }
      : null,
    orderedSelectedRoles.length > 0
      ? {
          id: 'roles',
          label: t({
            zh: `定位：${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join(' / ')}`,
            en: `Role: ${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空定位筛选', en: 'Clear role filter' }),
        }
      : null,
    orderedSelectedAffiliations.length > 0
      ? {
          id: 'affiliations',
          label: t({
            zh: `联动队伍：${orderedSelectedAffiliations
              .map((affiliation) => getPrimaryLocalizedText(affiliation, locale))
              .join(' / ')}`,
            en: `Affiliation: ${orderedSelectedAffiliations
              .map((affiliation) => getPrimaryLocalizedText(affiliation, locale))
              .join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空联动队伍筛选', en: 'Clear affiliation filter' }),
        }
      : null,
    orderedSelectedRaces.length > 0
      ? {
          id: 'races',
          label: t({
            zh: `种族：${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join(' / ')}`,
            en: `Race: ${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空种族筛选', en: 'Clear race filter' }),
        }
      : null,
    orderedSelectedGenders.length > 0
      ? {
          id: 'genders',
          label: t({
            zh: `性别：${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join(' / ')}`,
            en: `Gender: ${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空性别筛选', en: 'Clear gender filter' }),
        }
      : null,
    orderedSelectedAlignments.length > 0
      ? {
          id: 'alignments',
          label: t({
            zh: `阵营：${orderedSelectedAlignments.map((alignment) => getChampionTagLabel(alignment, locale)).join(' / ')}`,
            en: `Alignment: ${orderedSelectedAlignments.map((alignment) => getChampionTagLabel(alignment, locale)).join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空阵营筛选', en: 'Clear alignment filter' }),
        }
      : null,
    orderedSelectedProfessions.length > 0
      ? {
          id: 'professions',
          label: t({
            zh: `职业：${orderedSelectedProfessions.map((profession) => getChampionTagLabel(profession, locale)).join(' / ')}`,
            en: `Profession: ${orderedSelectedProfessions.map((profession) => getChampionTagLabel(profession, locale)).join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空职业筛选', en: 'Clear profession filter' }),
        }
      : null,
    orderedSelectedAcquisitions.length > 0
      ? {
          id: 'acquisitions',
          label: t({
            zh: `获取方式：${orderedSelectedAcquisitions
              .map((acquisition) => getChampionTagLabel(acquisition, locale))
              .join(' / ')}`,
            en: `Availability: ${orderedSelectedAcquisitions
              .map((acquisition) => getChampionTagLabel(acquisition, locale))
              .join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空获取方式筛选', en: 'Clear availability filter' }),
        }
      : null,
    orderedSelectedMechanics.length > 0
      ? {
          id: 'mechanics',
          label: t({
            zh: `机制：${orderedSelectedMechanics.map((mechanic) => getChampionTagLabel(mechanic, locale)).join(' / ')}`,
            en: `Mechanics: ${orderedSelectedMechanics.map((mechanic) => getChampionTagLabel(mechanic, locale)).join(' / ')}`,
          }),
          clearLabel: t({ zh: '清空机制筛选', en: 'Clear mechanics filter' }),
        }
      : null,
  ].filter((chip): chip is ActiveFilterChip => chip !== null)
}
