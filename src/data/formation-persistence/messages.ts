import type { LocaleText } from '../../app/i18n'
import type { FormationSnapshotLike, FormationSnapshotPreview } from './types'

export function buildDroppedReferenceDetail(
  invalidSlotIds: string[],
  invalidChampionIds: string[],
): LocaleText | null {
  const zhParts: string[] = []
  const enParts: string[] = []

  if (invalidSlotIds.length > 0) {
    zhParts.push(`${String(invalidSlotIds.length)} 个槽位引用已失效`)
    enParts.push(`${String(invalidSlotIds.length)} slot reference(s) invalid`)
  }

  if (invalidChampionIds.length > 0) {
    zhParts.push(`${String(invalidChampionIds.length)} 个英雄引用已失效`)
    enParts.push(`${String(invalidChampionIds.length)} champion reference(s) invalid`)
  }

  if (zhParts.length === 0) {
    return null
  }

  return { zh: zhParts.join('；'), en: enParts.join('; ') }
}

export function buildRestoreStatusDetail<T extends FormationSnapshotLike>(
  preview: FormationSnapshotPreview<T>,
): LocaleText {
  const zhParts = [
    preview.restoreMode === 'compatible'
      ? `保存版本 ${preview.snapshot.dataVersion} 已不可读，当前按 ${preview.dataVersion} 兼容恢复。`
      : `已按数据版本 ${preview.dataVersion} 恢复。`,
  ]
  const enParts = [
    preview.restoreMode === 'compatible'
      ? `Saved version ${preview.snapshot.dataVersion} is unreadable; restored compatibly with ${preview.dataVersion}.`
      : `Restored with data version ${preview.dataVersion}.`,
  ]

  const droppedDetail = buildDroppedReferenceDetail(preview.invalidSlotIds, preview.invalidChampionIds)

  if (droppedDetail) {
    zhParts.push(droppedDetail.zh)
    enParts.push(droppedDetail.en)
  }

  return { zh: zhParts.join(' '), en: enParts.join(' ') }
}
