import type { AppLocale } from '../../app/i18n'
import { ATTRIBUTE_GROUP_MATCHERS, ROLE_TAGS } from './constants'
import { ATTRIBUTE_GROUP_LABELS, MECHANIC_CATEGORY_LABELS, TAG_LABELS } from './labels'
import { buildFallbackTagLabel } from './helpers'
import type {
  ChampionAttributeGroup,
  ChampionAttributeGroupId,
  ChampionMechanicCategoryId,
} from './types'

export function getChampionAttributeTags(tags: string[]): string[] {
  return tags.filter((tag) => !ROLE_TAGS.has(tag))
}

export function getChampionMechanicCategoryId(tag: string): ChampionMechanicCategoryId | null {
  if (tag === 'positional') {
    return 'positional'
  }

  if (tag.startsWith('control_')) {
    return 'control'
  }

  if (tag.startsWith('spec_')) {
    return 'specialization'
  }

  return null
}

export function getChampionTagsForGroup(
  tags: string[],
  groupId: ChampionAttributeGroupId,
): string[] {
  const attributeTags = getChampionAttributeTags(tags)

  if (groupId === 'other') {
    const usedTags = new Set(
      Object.keys(ATTRIBUTE_GROUP_MATCHERS).flatMap((id) =>
        attributeTags.filter((tag) =>
          ATTRIBUTE_GROUP_MATCHERS[id as Exclude<ChampionAttributeGroupId, 'other'>](tag),
        ),
      ),
    )

    return attributeTags.filter((tag) => !usedTags.has(tag))
  }

  return attributeTags.filter((tag) => ATTRIBUTE_GROUP_MATCHERS[groupId](tag))
}

export function getChampionAttributeGroups(tags: string[]): ChampionAttributeGroup[] {
  const groups: ChampionAttributeGroup[] = (
    Object.keys(ATTRIBUTE_GROUP_MATCHERS) as Array<Exclude<ChampionAttributeGroupId, 'other'>>
  )
    .map((groupId) => ({
      id: groupId,
      tags: getChampionTagsForGroup(tags, groupId),
    }))
    .filter((group) => group.tags.length > 0)

  const otherTags = getChampionTagsForGroup(tags, 'other')

  if (otherTags.length > 0) {
    groups.push({
      id: 'other',
      tags: otherTags,
    })
  }

  return groups
}

export function getChampionAttributeGroupLabel(groupId: ChampionAttributeGroupId, locale: AppLocale): string {
  return ATTRIBUTE_GROUP_LABELS[groupId][locale]
}

export function getChampionMechanicCategoryLabel(
  categoryId: ChampionMechanicCategoryId,
  locale: AppLocale,
): string {
  return MECHANIC_CATEGORY_LABELS[categoryId][locale]
}

export function getChampionTagLabel(tag: string, locale: AppLocale): string {
  const mapped = TAG_LABELS[tag]
  return mapped ? mapped[locale] : buildFallbackTagLabel(tag, locale)
}
