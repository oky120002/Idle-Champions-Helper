import type { FormationSnapshotLike, FormationSnapshotPreview } from './types'

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
