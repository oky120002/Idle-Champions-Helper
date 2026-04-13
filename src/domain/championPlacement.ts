import type { Champion } from './types'

export function buildOrderedChampionsFromPlacements(
  placements: Record<string, string>,
  champions: Champion[],
): Champion[] {
  const championsById = new Map(champions.map((champion) => [champion.id, champion]))

  return Object.values(placements)
    .map((championId) => championsById.get(championId) ?? null)
    .filter((champion): champion is Champion => champion !== null)
    .sort(
      (left, right) =>
        left.seat - right.seat ||
        left.name.display.localeCompare(right.name.display) ||
        left.name.original.localeCompare(right.name.original) ||
        left.id.localeCompare(right.id),
    )
}
