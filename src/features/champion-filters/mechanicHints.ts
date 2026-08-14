import type { MessageRef , TranslateParams} from '../../app/i18n'
import type { MechanicOptionGroup } from './types'

export function getMechanicCategoryHint(
  groupId: MechanicOptionGroup['id'],
  t: (text: string | MessageRef, params?: TranslateParams) => string,
): string {
  if (groupId === 'positional') {
    return t("前后排、相邻位或固定站位会直接影响这类英雄的发挥。")
  }

  if (groupId === 'control') {
    return t("会直接施加眩晕、减速、击退、定身或位移等控制效果。")
  }

  return t("专精分支会偏向金币、速度、减益或特定敌人猎杀。")
}
