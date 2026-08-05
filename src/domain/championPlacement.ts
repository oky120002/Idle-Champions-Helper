import type { Champion } from './types'

export function buildOrderedChampionsFromPlacements(
  placements: Record<string, string>,
  champions: Champion[],
): Champion[] {
  const championsById = new Map(champions.map((champion) => [champion.id, champion]))

  return Object.values(placements)
    .map((championId) => championsById.get(championId) ?? null)
    .filter((champion): champion is Champion => champion !== null)
    .sort((left, right) => {
      const seatDiff = left.seat - right.seat
      // 原(|| 链)语义：NaN/0 视 falsy 回退到下一比较器；保留同行为
      if (seatDiff !== 0 && !Number.isNaN(seatDiff)) return seatDiff
      const displayDiff = left.name.display.localeCompare(right.name.display)
      if (displayDiff !== 0) return displayDiff
      const originalDiff = left.name.original.localeCompare(right.name.original)
      if (originalDiff !== 0) return originalDiff
      return left.id.localeCompare(right.id)
    })
}
