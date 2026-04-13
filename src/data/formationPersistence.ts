import type { Champion, FormationLayout, ScenarioRef } from '../domain/types'
import { loadCollectionAtVersion } from './client'

export interface FormationSnapshotLike {
  schemaVersion: number
  dataVersion: string
  layoutId: string
  scenarioRef: ScenarioRef | null
  placements: Record<string, string>
  updatedAt: string
}

export type FormationRestoreMode = 'exact' | 'compatible'

export interface ValidatedFormationPlacements {
  layout: FormationLayout
  placements: Record<string, string>
  invalidSlotIds: string[]
  invalidChampionIds: string[]
}

export interface FormationSnapshotPreview<T extends FormationSnapshotLike> {
  snapshot: T
  layoutName: string
  dataVersion: string
  restoreMode: FormationRestoreMode
  formations: FormationLayout[]
  champions: Champion[]
  placements: Record<string, string>
  invalidSlotIds: string[]
  invalidChampionIds: string[]
}

export type FormationSnapshotPrompt<T extends FormationSnapshotLike> =
  | {
      kind: 'restore'
      preview: FormationSnapshotPreview<T>
    }
  | {
      kind: 'invalid'
      snapshot: T
      title: string
      detail: string
    }

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

export function buildDroppedReferenceDetail(invalidSlotIds: string[], invalidChampionIds: string[]): string {
  const parts: string[] = []

  if (invalidSlotIds.length > 0) {
    parts.push(`${invalidSlotIds.length} 个槽位引用已失效`)
  }

  if (invalidChampionIds.length > 0) {
    parts.push(`${invalidChampionIds.length} 个英雄引用已失效`)
  }

  return parts.join('；')
}

export function buildRestoreStatusDetail<T extends FormationSnapshotLike>(
  preview: FormationSnapshotPreview<T>,
): string {
  const parts = [
    preview.restoreMode === 'compatible'
      ? `保存版本 ${preview.snapshot.dataVersion} 已不可读，当前按 ${preview.dataVersion} 兼容恢复。`
      : `已按数据版本 ${preview.dataVersion} 恢复。`,
  ]

  const droppedDetail = buildDroppedReferenceDetail(preview.invalidSlotIds, preview.invalidChampionIds)

  if (droppedDetail) {
    parts.push(droppedDetail)
  }

  return parts.join(' ')
}

export async function buildFormationSnapshotPrompt<T extends FormationSnapshotLike>(
  snapshot: T,
  currentDataVersion: string,
  currentFormations: FormationLayout[],
  currentChampions: Champion[],
  sourceLabel: string,
  expectedSchemaVersion: number,
): Promise<FormationSnapshotPrompt<T>> {
  if (snapshot.schemaVersion !== expectedSchemaVersion) {
    return {
      kind: 'invalid',
      snapshot,
      title: `${sourceLabel}版本过旧，当前不能直接恢复`,
      detail: `当前只识别 schemaVersion=${expectedSchemaVersion} 的${sourceLabel}；检测到旧版本为 ${snapshot.schemaVersion}。`,
    }
  }

  let restoreMode: FormationRestoreMode = 'exact'
  let dataVersion = snapshot.dataVersion
  let formations = currentFormations
  let champions = currentChampions

  if (snapshot.dataVersion !== currentDataVersion) {
    try {
      const [formationCollection, championCollection] = await Promise.all([
        loadCollectionAtVersion<FormationLayout>(snapshot.dataVersion, 'formations'),
        loadCollectionAtVersion<Champion>(snapshot.dataVersion, 'champions'),
      ])

      formations = formationCollection.items
      champions = championCollection.items
    } catch {
      restoreMode = 'compatible'
      dataVersion = currentDataVersion
    }
  }

  const validated = validateFormationPlacements(snapshot, formations, champions)

  if (!validated) {
    return {
      kind: 'invalid',
      snapshot,
      title: `${sourceLabel}引用的布局已不存在，当前不能安全恢复`,
      detail:
        restoreMode === 'compatible'
          ? `保存时的数据版本 ${snapshot.dataVersion} 已不可读，且当前版本 ${currentDataVersion} 中也找不到布局 ${snapshot.layoutId}。`
          : `保存版本 ${snapshot.dataVersion} 中已找不到布局 ${snapshot.layoutId}。`,
    }
  }

  const originalPlacementCount = Object.keys(snapshot.placements).length
  const validPlacementCount = Object.keys(validated.placements).length

  if (originalPlacementCount === 0 || validPlacementCount === 0) {
    const droppedDetail = buildDroppedReferenceDetail(validated.invalidSlotIds, validated.invalidChampionIds)

    return {
      kind: 'invalid',
      snapshot,
      title: `${sourceLabel}没有可恢复的有效放置结果`,
      detail: droppedDetail || `${sourceLabel}中没有任何可用的槽位与英雄映射。`,
    }
  }

  return {
    kind: 'restore',
    preview: {
      snapshot,
      layoutName: validated.layout.name,
      dataVersion,
      restoreMode,
      formations,
      champions,
      placements: validated.placements,
      invalidSlotIds: validated.invalidSlotIds,
      invalidChampionIds: validated.invalidChampionIds,
    },
  }
}
