import type { MessageRef } from '../../app/i18n'
import type { FormationSnapshotLike, FormationSnapshotPreview } from './types'

export function buildDroppedReferenceDetail(
  invalidSlotIds: string[],
  invalidChampionIds: string[],
): MessageRef | null {
  if (invalidSlotIds.length === 0 && invalidChampionIds.length === 0) {
    return null
  }

  if (invalidSlotIds.length > 0 && invalidChampionIds.length > 0) {
    return {
      key: '{p0} 个槽位引用已失效；{p1} 个英雄引用已失效',
      params: { p0: invalidSlotIds.length, p1: invalidChampionIds.length },
    }
  }

  return invalidSlotIds.length > 0
    ? { key: '{p0} 个槽位引用已失效', params: { p0: invalidSlotIds.length } }
    : { key: '{p0} 个英雄引用已失效', params: { p0: invalidChampionIds.length } }
}

export function buildRestoreStatusDetail<T extends FormationSnapshotLike>(
  preview: FormationSnapshotPreview<T>,
): MessageRef {
  const droppedDetail = buildDroppedReferenceDetail(preview.invalidSlotIds, preview.invalidChampionIds)

  if (preview.restoreMode === 'compatible') {
    return droppedDetail
      ? { key: '保存版本 {p0} 已不可读，当前按 {p1} 兼容恢复。{p2}', params: { p0: preview.snapshot.dataVersion, p1: preview.dataVersion, p2: droppedDetail } }
      : { key: '保存版本 {p0} 已不可读，当前按 {p1} 兼容恢复。', params: { p0: preview.snapshot.dataVersion, p1: preview.dataVersion } }
  }

  return droppedDetail
    ? { key: '已按数据版本 {p0} 恢复。{p1}', params: { p0: preview.dataVersion, p1: droppedDetail } }
    : { key: '已按数据版本 {p0} 恢复。', params: { p0: preview.dataVersion } }
}
