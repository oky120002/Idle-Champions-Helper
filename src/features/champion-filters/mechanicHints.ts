import type { LocaleText } from '../../app/i18n'
import type { MechanicOptionGroup } from './types'

export function getMechanicCategoryHint(
  groupId: MechanicOptionGroup['id'],
  t: (text: LocaleText) => string,
): string {
  if (groupId === 'positional') {
    return t({
      zh: '前后排、相邻位或固定站位会直接影响这类英雄的发挥。',
      en: 'These champions care about adjacency, rows, or specific formation slots.',
    })
  }

  if (groupId === 'control') {
    return t({
      zh: '会直接施加眩晕、减速、击退、定身或位移等控制效果。',
      en: 'These champions directly apply effects like stun, slow, knockback, root, or repositioning.',
    })
  }

  return t({
    zh: '专精分支会偏向金币、速度、减益或特定敌人猎杀。',
    en: 'Their specialization paths lean toward gold, speed, debuffs, or hunting certain enemy types.',
  })
}
