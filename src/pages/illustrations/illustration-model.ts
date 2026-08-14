/* eslint-disable max-lines -- 立绘图鉴模型层，内聚构建/统计/筛选 chip 函数，拆分会降低一跳命中率 */
import { formatSeatLabel, getPrimaryLocalizedText, getRoleLabel } from '../../domain/localizedText'
import { getChampionTagLabel } from '../../domain/champion-tags/selectors'
import type { Champion, ChampionIllustration, ChampionIllustrationKind, LocalizedText } from '../../domain/types'
import type { ActiveFilterChip, IdLocalizedOption } from '../../features/champion-filters/types'
import type { FilterableIllustration } from '../../rules/illustrationFilter'
import { selectLocaleText as pickText, t } from '../../app/i18n-messages'
import type { IllustrationsFilterState, ViewFilter } from './types'

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
  const effectiveSeed = seed === 0 || Number.isNaN(seed) ? 1 : seed
  let value = effectiveSeed

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
    filters.selectedMechanics.length > 0 ||
    filters.selectedPatrons.length > 0
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
    secondary,
    primary: illustrationName,
    text: secondary != null ? `${illustrationName} · ${secondary}` : illustrationName,
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
  orderedSelectedPatrons: IdLocalizedOption[]
}

export function buildActiveIllustrationFilterChips({
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
}: BuildActiveFilterChipsOptions): ActiveFilterChip[] {
  const trimmedSearch = filters.search.trim()

  return [
    trimmedSearch !== ''
      ? {
          id: 'search',
          label: t(locale, '关键词：{p0}', { p0: trimmedSearch }),
          clearLabel: t(locale, '清空关键词：{p0}', { p0: trimmedSearch }),
        }
      : null,
    filters.scope !== 'all'
      ? {
          id: 'view',
          label: pickText(locale, `范围：${buildViewFilterLabel(filters.scope, locale)}`, `Scope: ${buildViewFilterLabel(filters.scope, locale)}`),
          clearLabel: pickText(locale, `清空范围筛选：${buildViewFilterLabel(filters.scope, locale)}`, `Clear scope filter: ${buildViewFilterLabel(filters.scope, locale)}`),
        }
      : null,
    orderedSelectedSeats.length > 0
      ? {
          id: 'seats',
          label: pickText(locale, `座位：${orderedSelectedSeats.map((seat) => formatSeatLabel(seat, locale)).join(' / ')}`, `Seat: ${orderedSelectedSeats.map((seat) => formatSeatLabel(seat, locale)).join(' / ')}`),
          clearLabel: pickText(locale, '清空座位筛选', 'Clear seat filter'),
        }
      : null,
    orderedSelectedRoles.length > 0
      ? {
          id: 'roles',
          label: pickText(locale, `定位：${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join(' / ')}`, `Role: ${orderedSelectedRoles.map((role) => getRoleLabel(role, locale)).join(' / ')}`),
          clearLabel: pickText(locale, '清空定位筛选', 'Clear role filter'),
        }
      : null,
    orderedSelectedAffiliations.length > 0
      ? {
          id: 'affiliations',
          label: pickText(locale, `联动队伍：${orderedSelectedAffiliations
              .map((affiliation) => getPrimaryLocalizedText(affiliation, locale))
              .join(' / ')}`, `Affiliation: ${orderedSelectedAffiliations
              .map((affiliation) => getPrimaryLocalizedText(affiliation, locale))
              .join(' / ')}`),
          clearLabel: pickText(locale, '清空联动队伍筛选', 'Clear affiliation filter'),
        }
      : null,
    orderedSelectedRaces.length > 0
      ? {
          id: 'races',
          label: pickText(locale, `种族：${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join(' / ')}`, `Race: ${orderedSelectedRaces.map((race) => getChampionTagLabel(race, locale)).join(' / ')}`),
          clearLabel: pickText(locale, '清空种族筛选', 'Clear race filter'),
        }
      : null,
    orderedSelectedGenders.length > 0
      ? {
          id: 'genders',
          label: pickText(locale, `性别：${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join(' / ')}`, `Gender: ${orderedSelectedGenders.map((gender) => getChampionTagLabel(gender, locale)).join(' / ')}`),
          clearLabel: pickText(locale, '清空性别筛选', 'Clear gender filter'),
        }
      : null,
    orderedSelectedAlignments.length > 0
      ? {
          id: 'alignments',
          label: pickText(locale, `阵营：${orderedSelectedAlignments.map((alignment) => getChampionTagLabel(alignment, locale)).join(' / ')}`, `Alignment: ${orderedSelectedAlignments.map((alignment) => getChampionTagLabel(alignment, locale)).join(' / ')}`),
          clearLabel: pickText(locale, '清空阵营筛选', 'Clear alignment filter'),
        }
      : null,
    orderedSelectedProfessions.length > 0
      ? {
          id: 'professions',
          label: pickText(locale, `职业：${orderedSelectedProfessions.map((profession) => getChampionTagLabel(profession, locale)).join(' / ')}`, `Profession: ${orderedSelectedProfessions.map((profession) => getChampionTagLabel(profession, locale)).join(' / ')}`),
          clearLabel: pickText(locale, '清空职业筛选', 'Clear profession filter'),
        }
      : null,
    orderedSelectedAcquisitions.length > 0
      ? {
          id: 'acquisitions',
          label: pickText(locale, `获取方式：${orderedSelectedAcquisitions
              .map((acquisition) => getChampionTagLabel(acquisition, locale))
              .join(' / ')}`, `Availability: ${orderedSelectedAcquisitions
              .map((acquisition) => getChampionTagLabel(acquisition, locale))
              .join(' / ')}`),
          clearLabel: pickText(locale, '清空获取方式筛选', 'Clear availability filter'),
        }
      : null,
    orderedSelectedMechanics.length > 0
      ? {
          id: 'mechanics',
          label: pickText(locale, `机制：${orderedSelectedMechanics.map((mechanic) => getChampionTagLabel(mechanic, locale)).join(' / ')}`, `Mechanics: ${orderedSelectedMechanics.map((mechanic) => getChampionTagLabel(mechanic, locale)).join(' / ')}`),
          clearLabel: pickText(locale, '清空机制筛选', 'Clear mechanics filter'),
        }
      : null,
    orderedSelectedPatrons.length > 0
      ? {
          id: 'patrons',
          label: pickText(locale, `赞助人：${orderedSelectedPatrons.map((patron) => getPrimaryLocalizedText(patron, locale)).join(' / ')}`, `Patrons: ${orderedSelectedPatrons.map((patron) => getPrimaryLocalizedText(patron, locale)).join(' / ')}`),
          clearLabel: pickText(locale, '清空赞助人筛选', 'Clear patron filter'),
        }
      : null,
  ].filter((chip): chip is ActiveFilterChip => chip !== null)
}
