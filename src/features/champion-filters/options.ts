import {
  getChampionMechanicCategoryId,
  getChampionTagLabel,
  getChampionTagsForGroup,
} from '../../domain/championTags'
import type { Champion } from '../../domain/types'
import type { AppLocale } from '../../app/i18n'
import type { AttributeFilterGroupId, MechanicOptionGroup } from './types'

export const seatOptions = Array.from({ length: 12 }, (_, index) => index + 1)

export function collectAttributeFilterOptions(
  champions: Champion[],
  groupId: AttributeFilterGroupId,
  locale: AppLocale,
): string[] {
  return Array.from(new Set(champions.flatMap((champion) => getChampionTagsForGroup(champion.tags, groupId)))).sort(
    (left, right) => getChampionTagLabel(left, locale).localeCompare(getChampionTagLabel(right, locale)),
  )
}

export function groupMechanicOptions(options: string[]): MechanicOptionGroup[] {
  const orderedCategories: MechanicOptionGroup['id'][] = ['positional', 'control', 'specialization']

  return orderedCategories
    .map((id) => ({
      id,
      options: options.filter((tag) => getChampionMechanicCategoryId(tag) === id),
    }))
    .filter((group) => group.options.length > 0)
}
