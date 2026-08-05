import type { LocaleText } from '../../app/i18n'
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
  sourceLabel: LocaleText,
  expectedSchemaVersion: number,
): Promise<FormationSnapshotPrompt<T>> {
  if (snapshot.schemaVersion !== expectedSchemaVersion) {
    return {
      kind: 'invalid',
      snapshot,
      title: {
        zh: `${sourceLabel.zh}版本过旧，当前不能直接恢复`,
        en: `${sourceLabel.en} version is too old to restore directly`,
      },
      detail: {
        zh: `当前只识别 schemaVersion=${String(expectedSchemaVersion)} 的${sourceLabel.zh}；检测到旧版本为 ${String(snapshot.schemaVersion)}。`,
        en: `Only schemaVersion=${String(expectedSchemaVersion)} ${sourceLabel.en} is supported; detected old version ${String(snapshot.schemaVersion)}.`,
      },
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
      title: {
        zh: `${sourceLabel.zh}引用的布局已不存在，当前不能安全恢复`,
        en: `The layout referenced by ${sourceLabel.en} no longer exists; cannot restore safely`,
      },
      detail:
        restoreMode === 'compatible'
          ? {
              zh: `保存时的数据版本 ${snapshot.dataVersion} 已不可读，且当前版本 ${currentDataVersion} 中也找不到布局 ${snapshot.layoutId}。`,
              en: `Saved data version ${snapshot.dataVersion} is unreadable, and layout ${snapshot.layoutId} is not found in the current version ${currentDataVersion} either.`,
            }
          : {
              zh: `保存版本 ${snapshot.dataVersion} 中已找不到布局 ${snapshot.layoutId}。`,
              en: `Layout ${snapshot.layoutId} is not found in saved version ${snapshot.dataVersion}.`,
            },
    }
  }

  const originalPlacementCount = Object.keys(snapshot.placements).length
  const validPlacementCount = Object.keys(validated.placements).length

  if (originalPlacementCount === 0 || validPlacementCount === 0) {
    const droppedDetail = buildDroppedReferenceDetail(validated.invalidSlotIds, validated.invalidChampionIds)

    return {
      kind: 'invalid',
      snapshot,
      title: {
        zh: `${sourceLabel.zh}没有可恢复的有效放置结果`,
        en: `${sourceLabel.en} has no valid placements to restore`,
      },
      detail: droppedDetail ?? {
        zh: `${sourceLabel.zh}中没有任何可用的槽位与英雄映射。`,
        en: `${sourceLabel.en} has no usable slot-to-champion mapping.`,
      },
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
