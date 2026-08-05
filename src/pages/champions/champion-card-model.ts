import type { ChampionAttributeGroup, ChampionAttributeGroupId } from '../../domain/champion-tags/types'

const DEFAULT_VISIBLE_ATTRIBUTE_GROUPS: ChampionAttributeGroupId[] = [
  'race',
  'alignment',
  'profession',
  'gender',
  'acquisition',
  'mechanics',
]

export interface ChampionCardFilterState {
  selectedAcquisitions: string[]
  selectedMechanics: string[]
}

export interface ChampionCardAttributePill {
  key: string
  groupId: ChampionAttributeGroupId
  tag: string
}

export function getChampionCardVisibleAttributeGroupIds(
  filters: ChampionCardFilterState,
): ChampionAttributeGroupId[] {
  // 当前固定返回默认清单；保留 filters 入参以维持公开签名与现有测试契约
  // eslint-disable-next-line sonarjs/void-use -- 显式标记故意不用的入参
  void filters

  return DEFAULT_VISIBLE_ATTRIBUTE_GROUPS
}

export function filterChampionCardAttributeGroups(
  attributeGroups: ChampionAttributeGroup[],
  filters: ChampionCardFilterState,
): ChampionAttributeGroup[] {
  const visibleGroupIds = new Set(getChampionCardVisibleAttributeGroupIds(filters))

  return attributeGroups.filter((group) => visibleGroupIds.has(group.id))
}

export function buildChampionCardAttributePills(
  attributeGroups: ChampionAttributeGroup[],
  filters: ChampionCardFilterState,
): ChampionCardAttributePill[] {
  const groupById = new Map(attributeGroups.map((group) => [group.id, group]))

  return getChampionCardVisibleAttributeGroupIds(filters).flatMap((groupId) =>
    (groupById.get(groupId)?.tags ?? []).map((tag) => ({
      key: `${groupId}:${tag}`,
      groupId,
      tag,
    })),
  )
}
