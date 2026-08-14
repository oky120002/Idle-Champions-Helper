/* eslint-disable max-lines -- 阵型英雄列表构建模块：tile/summary/equipment-slot 视图模型紧耦合，拆文件增加跨文件跳转 */
import type { Champion, ChampionDetail, ChampionLootDetail, LocalizedText } from '../../domain/types'
import type { MessageRef } from '../../app/i18n'
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
  label: MessageRef
  value: number
  total: number
  description: MessageRef
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
  maxLevel: number[] | null
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
  levelCap: number | null
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

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function normalizeEquipmentLevelCaps(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const caps = value
    .map((entry) => toNumber(typeof entry === 'number' || typeof entry === 'string' ? entry : null))
    .filter((entry) => entry > 0)

  return caps.length > 0 ? caps : null
}

function extractSlotIdFromRawLootEntry(value: unknown): string | null {
  const record = toRecord(value)
  const snapshots = toRecord(record?.snapshots)
  const original = toRecord(snapshots?.original)
  const display = toRecord(snapshots?.display)
  const rawSlotId = original?.slot_id ?? display?.slot_id
  const slotId = toNumber(typeof rawSlotId === 'number' || typeof rawSlotId === 'string' ? rawSlotId : null)

  return slotId > 0 ? String(slotId) : null
}

function extractMaxLevelFromRawLootEntry(value: unknown): number[] | null {
  const record = toRecord(value)
  const snapshots = toRecord(record?.snapshots)
  const original = toRecord(snapshots?.original)
  const display = toRecord(snapshots?.display)

  return normalizeEquipmentLevelCaps(original?.max_level ?? display?.max_level ?? null)
}

function buildEquipmentLevelCapsBySlot(detail: ChampionDetail | null): Map<string, number[]> {
  const capsBySlot = new Map<string, number[]>()

  for (const item of detail?.loot ?? []) {
    if (item.slotId === null) {
      continue
    }

    const caps = normalizeEquipmentLevelCaps(item.maxLevel)

    if (caps) {
      capsBySlot.set(String(item.slotId), caps)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- 类型声明 raw 为必填，但测试和运行时数据可能缺该字段，保留 ?. 防御
  for (const item of detail?.raw?.loot ?? []) {
    const slotId = extractSlotIdFromRawLootEntry(item)

    if (slotId == null || slotId === '' || capsBySlot.has(slotId)) {
      continue
    }

    const caps = extractMaxLevelFromRawLootEntry(item)

    if (caps) {
      capsBySlot.set(slotId, caps)
    }
  }

  return capsBySlot
}

function resolveEquipmentLevelCap(maxLevel: number[] | null, gild: number): number | null {
  if (!maxLevel || maxLevel.length === 0) {
    return null
  }

  const index = Math.min(Math.max(gild, 0), maxLevel.length - 1)
  const cap = maxLevel[index]

  return typeof cap === 'number' && Number.isFinite(cap) && cap > 0 ? cap : null
}

export function buildOwnedHeroById(ownedHeroes: OwnedHero[]): Map<string, OwnedHero> {
  return new Map(ownedHeroes.map((hero) => [hero.heroId, hero]))
}

function resolveRosterTileEmphasis(isOwned: boolean, matchesFilters: boolean): ChampionRosterTile['emphasis'] {
  if (!isOwned) {
    return 'dim-unowned'
  }
  return matchesFilters ? 'match' : 'dim-owned'
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
          emphasis: resolveRosterTileEmphasis(isOwned, matchesFilters),
        }
      }),
    }
  })
}

function countRosterSlotMetrics(ownedHeroes: OwnedHero[]): {
  epicSlots: number
  shinySlots: number
  goldenSlots: number
  legendarySlots: number
} {
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

  return { epicSlots, shinySlots, goldenSlots, legendarySlots }
}

function buildRosterSummaryMetrics(
  ownedChampionCount: number,
  totalChampionCount: number,
  totalOwnedSlots: number,
  slotCounts: ReturnType<typeof countRosterSlotMetrics>,
): ChampionRosterSummaryMetric[] {
  return [
    {
      id: 'owned',
      label: { key: '已拥有英雄' },
      value: ownedChampionCount,
      total: totalChampionCount,
      description: { key: '当前快照里已经解锁并可投入阵型的英雄数量。' },
    },
    {
      id: 'epic-slots',
      label: { key: '史诗装备槽位' },
      value: slotCounts.epicSlots,
      total: totalOwnedSlots,
      description: { key: '已拥有英雄的装备槽里，达到史诗稀有度的总槽位。' },
    },
    {
      id: 'shiny-slots',
      label: { key: '闪耀槽位' },
      value: slotCounts.shinySlots,
      total: totalOwnedSlots,
      description: { key: '当前已拥有的闪耀装备槽位数量。' },
    },
    {
      id: 'golden-slots',
      label: { key: '金装槽位' },
      value: slotCounts.goldenSlots,
      total: totalOwnedSlots,
      description: { key: '当前已拥有的 Golden 装备槽位数量。' },
    },
    {
      id: 'legendary-slots',
      label: { key: '传奇装备位' },
      value: slotCounts.legendarySlots,
      total: totalOwnedSlots,
      description: { key: '已经激活传奇等级的装备槽位数量。' },
    },
  ]
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
  const slotCounts = countRosterSlotMetrics(ownedHeroes)

  return {
    ownedChampionCount,
    totalChampionCount,
    matchedOwnedChampionCount,
    matchedChampionCount: matchedChampionIds.size,
    metrics: buildRosterSummaryMetrics(ownedChampionCount, totalChampionCount, totalOwnedSlots, slotCounts),
  }
}

function computeLootWeight(rarity: number, isGoldenEpic: boolean): number {
  return rarity * 10 + (isGoldenEpic ? 0 : 1)
}

function pickLocalizedDisplayText(text: LocalizedText | null): string | null {
  if (text === null) {
    return null
  }
  if (text.display !== '') {
    return text.display
  }
  if (text.original !== '') {
    return text.original
  }
  return null
}

function choosePreferredLootDetailBySlot(
  loot: ChampionLootDetail[],
  levelCapsBySlot: ReadonlyMap<string, number[]>,
): Map<string, ChampionEquipmentSlotDefinition> {
  const definitions = new Map<string, ChampionEquipmentSlotDefinition>()

  for (const item of loot) {
    if (item.slotId === null) {
      continue
    }

    const slotId = String(item.slotId)
    const current = definitions.get(slotId)
    const currentWeight = current ? computeLootWeight(current.rarity, current.isGoldenEpic) : -1
    const nextRarity = toNumber(item.rarity)
    const nextWeight = computeLootWeight(nextRarity, item.isGoldenEpic)

    if (nextWeight <= currentWeight) {
      continue
    }

    definitions.set(slotId, {
      slotId,
      name: item.name.display !== '' ? item.name.display : item.name.original,
      description: pickLocalizedDisplayText(item.description),
      rarity: nextRarity,
      maxLevel: normalizeEquipmentLevelCaps(item.maxLevel) ?? levelCapsBySlot.get(slotId) ?? null,
      graphicId: item.graphicId,
      allowGoldenEpic: item.allowGoldenEpic,
      isGoldenEpic: item.isGoldenEpic,
    })
  }

  return definitions
}

function buildEquipmentSlotViewModel(
  slotId: string,
  ownedHero: OwnedHero | null,
  detailDefinitions: ReadonlyMap<string, ChampionEquipmentSlotDefinition>,
  levelCapsBySlot: ReadonlyMap<string, number[]>,
  legendaryLevelCap: number,
): ChampionEquipmentSlotViewModel {
  const slot = ownedHero?.lootBySlot[slotId] ?? null
  const definition = detailDefinitions.get(slotId) ?? null
  const legendary = ownedHero?.legendaryBySlot[slotId] ?? null

  const fallbackMaxLevel = levelCapsBySlot.get(slotId) ?? null
  const maxLevel = definition !== null && definition.maxLevel !== null
    ? definition.maxLevel
    : fallbackMaxLevel
  const gild = slot === null ? 0 : slot.gild
  const levelCap = resolveEquipmentLevelCap(maxLevel, gild)

  const name = definition === null ? `槽位 ${slotId}` : definition.name
  const description = definition === null ? null : definition.description
  let rarity: number
  if (slot !== null) {
    rarity = slot.rarity
  } else if (definition !== null) {
    rarity = definition.rarity
  } else {
    rarity = 0
  }
  const enchant = slot === null ? 0 : slot.enchant
  const pigment = slot === null ? 0 : slot.pigment
  const found = slot === null ? {} : slot.found
  const graphicId = definition === null ? null : definition.graphicId
  const legendaryLevel = legendary === null ? 0 : legendary.level
  const legendaryCap = legendary === null ? 0 : legendaryLevelCap

  return {
    slotId,
    levelCap,
    name,
    description,
    rarity,
    gild,
    enchant,
    pigment,
    found,
    graphicId,
    legendaryLevel,
    legendaryCap,
    hasIconBackground: Boolean(graphicId),
  }
}

export function buildChampionEquipmentSlots(
  detail: ChampionDetail | null,
  ownedHero: OwnedHero | null,
  legendaryLevelCap: number,
): ChampionEquipmentSlotViewModel[] {
  const levelCapsBySlot = buildEquipmentLevelCapsBySlot(detail)
  const detailDefinitions = detail
    ? choosePreferredLootDetailBySlot(detail.loot, levelCapsBySlot)
    : new Map<string, ChampionEquipmentSlotDefinition>()
  const slotIds = new Set<string>([
    ...Object.keys(ownedHero?.lootBySlot ?? {}),
    ...Array.from(detailDefinitions.keys()),
  ])

  return Array.from(slotIds)
    .sort((left, right) => Number(left) - Number(right))
    .map((slotId) => buildEquipmentSlotViewModel(slotId, ownedHero, detailDefinitions, levelCapsBySlot, legendaryLevelCap))
}
