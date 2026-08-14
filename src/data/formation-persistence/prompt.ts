import type { MessageRef } from '../../app/i18n'
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
  sourceLabel: MessageRef,
  expectedSchemaVersion: number,
): Promise<FormationSnapshotPrompt<T>> {
  if (snapshot.schemaVersion !== expectedSchemaVersion) {
    return {
      kind: 'invalid',
      snapshot,
      title: { key: '{p0}版本过旧，当前不能直接恢复', params: { p0: sourceLabel } },
      detail: { key: '当前只识别 schemaVersion={p0} 的{p1}；检测到旧版本为 {p2}。', params: { p0: expectedSchemaVersion, p1: sourceLabel, p2: snapshot.schemaVersion } },
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
       title: { key: '{p0}引用的布局已不存在，当前不能安全恢复', params: { p0: sourceLabel } },
      detail:
        restoreMode === 'compatible'
          ? { key: '保存时的数据版本 {p0} 已不可读，且当前版本 {p1} 中也找不到布局 {p2}。', params: { p0: snapshot.dataVersion, p1: currentDataVersion, p2: snapshot.layoutId } }
          : { key: '保存版本 {p0} 中已找不到布局 {p1}。', params: { p0: snapshot.dataVersion, p1: snapshot.layoutId } },
    }
  }

  const originalPlacementCount = Object.keys(snapshot.placements).length
  const validPlacementCount = Object.keys(validated.placements).length

  if (originalPlacementCount === 0 || validPlacementCount === 0) {
    const droppedDetail = buildDroppedReferenceDetail(validated.invalidSlotIds, validated.invalidChampionIds)

    return {
      kind: 'invalid',
      snapshot,
       title: { key: '{p0}没有可恢复的有效放置结果', params: { p0: sourceLabel } },
       detail: droppedDetail ?? { key: '{p0}中没有任何可用的槽位与英雄映射。', params: { p0: sourceLabel } },
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
