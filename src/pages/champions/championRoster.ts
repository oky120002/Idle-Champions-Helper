import type { Champion, ChampionDetail, ChampionLootDetail } from '../../domain/types'
import type { OwnedHero } from '../../domain/user-profile/types'

export interface ChampionRosterTile {
  champion: Champion
  ownedHero: OwnedHero | null
  isOwned: boolean
  matchesFilters: boolean
  emphasis: 'match' | 'dim-owned' | 'dim-unowned'
}

export interface ChampionRosterSeatColumn {
  seat: number
  champions: ChampionRosterTile[]
}

export interface ChampionRosterSummaryMetric {
  id: string
  label: string
  value: number
  total: number
  description: string
}

export interface ChampionRosterSummary {
  ownedChampionCount: number
  totalChampionCount: number
  matchedOwnedChampionCount: number
  matchedChampionCount: number
  metrics: ChampionRosterSummaryMetric[]
}

export interface ChampionEquipmentSlotDefinition {
  slotId: string
  name: string
  description: string | null
  rarity: number
  graphicId: string | null
  allowGoldenEpic: boolean
  isGoldenEpic: boolean
}

export interface ChampionEquipmentSlotViewModel {
  slotId: string
  name: string
  description: string | null
  rarity: number
  gild: number
  enchant: number
  pigment: number
  found: Record<string, number>
  hasIconBackground: boolean
  graphicId: string | null
  legendaryLevel: number
  legendaryCap: number
}

const SEAT_ORDER = Array.from({ length: 12 }, (_, index) => index + 1)

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export function buildOwnedHeroById(ownedHeroes: OwnedHero[]): Map<string, OwnedHero> {
  return new Map(ownedHeroes.map((hero) => [hero.heroId, hero]))
}

export function buildChampionRosterSeatColumns(
  champions: Champion[],
  matchedChampionIds: ReadonlySet<string>,
  ownedHeroById: ReadonlyMap<string, OwnedHero>,
): ChampionRosterSeatColumn[] {
  return SEAT_ORDER.map((seat) => {
    const seatChampions = champions
      .filter((champion) => champion.seat === seat)
      .sort((left, right) => left.id.localeCompare(right.id))

    return {
      seat,
      champions: seatChampions.map((champion) => {
        const ownedHero = ownedHeroById.get(champion.id) ?? null
        const isOwned = ownedHero !== null
        const matchesFilters = matchedChampionIds.has(champion.id)

        return {
          champion,
          ownedHero,
          isOwned,
          matchesFilters,
          emphasis: !isOwned
            ? 'dim-unowned'
            : matchesFilters
              ? 'match'
              : 'dim-owned',
        }
      }),
    }
  })
}

export function buildChampionRosterSummary(
  champions: Champion[],
  ownedHeroes: OwnedHero[],
  matchedChampionIds: ReadonlySet<string>,
): ChampionRosterSummary {
  const ownedHeroById = buildOwnedHeroById(ownedHeroes)
  const ownedChampionCount = ownedHeroes.length
  const totalChampionCount = champions.length
  const matchedOwnedChampionCount = Array.from(matchedChampionIds).filter((championId) => ownedHeroById.has(championId)).length
  const totalOwnedSlots = ownedChampionCount * 6

  let epicSlots = 0
  let shinySlots = 0
  let goldenSlots = 0
  let legendarySlots = 0

  for (const hero of ownedHeroes) {
    for (const slot of Object.values(hero.lootBySlot)) {
      if (slot.rarity >= 4) {
        epicSlots += 1
      }

      if (slot.gild === 1) {
        shinySlots += 1
      }

      if (slot.gild === 2) {
        goldenSlots += 1
      }
    }

    legendarySlots += Object.keys(hero.legendaryBySlot).length
  }

  return {
    ownedChampionCount,
    totalChampionCount,
    matchedOwnedChampionCount,
    matchedChampionCount: matchedChampionIds.size,
    metrics: [
      {
        id: 'owned',
        label: '已拥有英雄',
        value: ownedChampionCount,
        total: totalChampionCount,
        description: '当前快照里已经解锁并可投入阵型的英雄数量。',
      },
      {
        id: 'epic-slots',
        label: '史诗装备槽位',
        value: epicSlots,
        total: totalOwnedSlots,
        description: '已拥有英雄的装备槽里，达到史诗稀有度的总槽位。',
      },
      {
        id: 'shiny-slots',
        label: '闪耀槽位',
        value: shinySlots,
        total: totalOwnedSlots,
        description: '当前已拥有的闪耀装备槽位数量。',
      },
      {
        id: 'golden-slots',
        label: '金装槽位',
        value: goldenSlots,
        total: totalOwnedSlots,
        description: '当前已拥有的 Golden 装备槽位数量。',
      },
      {
        id: 'legendary-slots',
        label: '传奇装备位',
        value: legendarySlots,
        total: totalOwnedSlots,
        description: '已经激活传奇等级的装备槽位数量。',
      },
    ],
  }
}

function choosePreferredLootDetailBySlot(loot: ChampionLootDetail[]): Map<string, ChampionEquipmentSlotDefinition> {
  const definitions = new Map<string, ChampionEquipmentSlotDefinition>()

  for (const item of loot) {
    if (item.slotId === null) {
      continue
    }

    const slotId = String(item.slotId)
    const current = definitions.get(slotId)
    const currentWeight = current ? current.rarity * 10 + (current.isGoldenEpic ? 0 : 1) : -1
    const nextRarity = toNumber(item.rarity)
    const nextWeight = nextRarity * 10 + (item.isGoldenEpic ? 0 : 1)

    if (nextWeight <= currentWeight) {
      continue
    }

    definitions.set(slotId, {
      slotId,
      name: item.name.display || item.name.original,
      description: item.description?.display || item.description?.original || null,
      rarity: nextRarity,
      graphicId: item.graphicId,
      allowGoldenEpic: item.allowGoldenEpic,
      isGoldenEpic: item.isGoldenEpic,
    })
  }

  return definitions
}

export function buildChampionEquipmentSlots(
  detail: ChampionDetail | null,
  ownedHero: OwnedHero | null,
  legendaryLevelCap: number,
): ChampionEquipmentSlotViewModel[] {
  const detailDefinitions = detail ? choosePreferredLootDetailBySlot(detail.loot ?? []) : new Map()
  const slotIds = new Set<string>([
    ...Object.keys(ownedHero?.lootBySlot ?? {}),
    ...Array.from(detailDefinitions.keys()),
  ])

  return Array.from(slotIds)
    .sort((left, right) => Number(left) - Number(right))
    .map((slotId) => {
      const slot = ownedHero?.lootBySlot[slotId] ?? null
      const definition = detailDefinitions.get(slotId) ?? null
      const legendary = ownedHero?.legendaryBySlot[slotId] ?? null

      return {
        slotId,
        name: definition?.name ?? `槽位 ${slotId}`,
        description: definition?.description ?? null,
        rarity: slot?.rarity ?? definition?.rarity ?? 0,
        gild: slot?.gild ?? 0,
        enchant: slot?.enchant ?? 0,
        pigment: slot?.pigment ?? 0,
        found: slot?.found ?? {},
        hasIconBackground: Boolean(definition?.graphicId),
        graphicId: definition?.graphicId ?? null,
        legendaryLevel: legendary?.level ?? 0,
        legendaryCap: legendary ? legendaryLevelCap : 0,
      }
    })
}
