import type { Champion, FormationLayout } from '../../domain/types'
import type { FormationSnapshotLike, ValidatedFormationPlacements } from './types'

export function validateFormationPlacements(
  snapshot: FormationSnapshotLike,
  formations: FormationLayout[],
  champions: Champion[],
): ValidatedFormationPlacements | null {
  const layout = formations.find((item) => item.id === snapshot.layoutId)

  if (!layout) {
    return null
  }

  const validSlotIds = new Set(layout.slots.map((slot) => slot.id))
  const validChampionIds = new Set(champions.map((champion) => champion.id))
  const placements: Record<string, string> = {}
  const invalidSlotIds: string[] = []
  const invalidChampionIds: string[] = []

  Object.entries(snapshot.placements).forEach(([slotId, championId]) => {
    if (!validSlotIds.has(slotId)) {
      invalidSlotIds.push(slotId)
      return
    }

    if (!validChampionIds.has(championId)) {
      invalidChampionIds.push(championId)
      return
    }

    placements[slotId] = championId
  })

  return {
    layout,
    placements,
    invalidSlotIds,
    invalidChampionIds,
  }
}
