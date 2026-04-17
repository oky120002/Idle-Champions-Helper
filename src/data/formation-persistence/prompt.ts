import type { Champion, FormationLayout } from '../../domain/types'
import { loadCollectionAtVersion } from '../client'
import { buildDroppedReferenceDetail } from './messages'
import type {
  FormationRestoreMode,
  FormationSnapshotLike,
  FormationSnapshotPrompt,
} from './types'
import { validateFormationPlacements } from './validation'

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
