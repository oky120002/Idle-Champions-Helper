import type { ChampionAttributeGroup, ChampionAttributeGroupId } from '../../domain/champion-tags/types'

const DEFAULT_VISIBLE_ATTRIBUTE_GROUPS: ChampionAttributeGroupId[] = [
  'race',
  'alignment',
  'profession',
  'gender',
]

export interface ChampionCardFilterState {
  selectedAcquisitions: string[]
  selectedMechanics: string[]
}

export function getChampionCardVisibleAttributeGroupIds(
  filters: ChampionCardFilterState,
): ChampionAttributeGroupId[] {
  return [
    ...DEFAULT_VISIBLE_ATTRIBUTE_GROUPS,
    ...(filters.selectedAcquisitions.length > 0 ? (['acquisition'] as const) : []),
    ...(filters.selectedMechanics.length > 0 ? (['mechanics'] as const) : []),
  ]
}

export function filterChampionCardAttributeGroups(
  attributeGroups: ChampionAttributeGroup[],
  filters: ChampionCardFilterState,
): ChampionAttributeGroup[] {
  const visibleGroupIds = new Set(getChampionCardVisibleAttributeGroupIds(filters))

  return attributeGroups.filter((group) => visibleGroupIds.has(group.id))
}
