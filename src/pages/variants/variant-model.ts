import { getLocalizedTextPair, matchesLocalizedText } from '../../domain/localizedText'
import type { LocalizedOption, Variant } from '../../domain/types'
import { ALL_CAMPAIGNS } from './constants'
import {
  getAttackProfileLabel,
  getEnemyTypeLabel,
  getSpecialEnemyRangeLabel,
} from './variant-labels'
import type {
  AttackProfileFilterId,
  CampaignEnumGroup,
  SpecialEnemyFilterId,
  VariantFilterOption,
} from './types'

const GENERIC_SEARCH_TAGS = new Set(['boss', 'melee', 'ranged', 'hits_based', 'armor_based', 'static'])

export function isCampaignEnumGroup(value: unknown): value is CampaignEnumGroup {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    value.id === 'campaigns' &&
    'values' in value &&
    Array.isArray(value.values)
  )
}

export function isLocalizedOption(value: unknown): value is LocalizedOption {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'original' in value &&
    typeof value.original === 'string' &&
    'display' in value &&
    typeof value.display === 'string'
  )
}

function toggleSelection(values: string[], nextValue: string): string[] {
  return values.includes(nextValue)
    ? values.filter((value) => value !== nextValue)
    : [...values, nextValue]
}

export function toggleVariantSelection(values: string[], nextValue: string): string[] {
  return toggleSelection(values, nextValue)
}

export function getAttackProfileId(variant: Pick<Variant, 'attackMix'>): Exclude<AttackProfileFilterId, '__all__'> {
  const total =
    variant.attackMix.melee +
    variant.attackMix.ranged +
    variant.attackMix.magic +
    variant.attackMix.other

  if (total <= 0) {
    return 'mixed'
  }

  const meleeShare = variant.attackMix.melee / total
  const rangedShare = variant.attackMix.ranged / total

  if (meleeShare >= 0.8) {
    return 'meleeHeavy'
  }

  if (rangedShare >= 0.2) {
    return 'rangedThreat'
  }

  return 'mixed'
}

export function getSpecialEnemyRangeId(count: number): Exclude<SpecialEnemyFilterId, '__all__'> {
  if (count <= 9) {
    return 'light'
  }

  if (count <= 12) {
    return 'standard'
  }

  return 'dense'
}

export function buildVariantOptions(options: {
  locale: 'zh-CN' | 'en-US'
  variants: Variant[]
}): {
  enemyTypeOptions: VariantFilterOption[]
  sceneOptions: VariantFilterOption[]
  commonObjectiveAreas: number[]
} {
  const { locale, variants } = options
  const enemyTypeCounts = new Map<string, number>()
  const sceneCounts = new Map<string, { label: string; count: number }>()
  const objectiveAreaCounts = new Map<number, number>()

  for (const variant of variants) {
    for (const enemyType of variant.enemyTypes) {
      enemyTypeCounts.set(enemyType, (enemyTypeCounts.get(enemyType) ?? 0) + 1)
    }

    if (variant.scene) {
      const current = sceneCounts.get(variant.scene.id)
      sceneCounts.set(variant.scene.id, {
        label: getLocalizedTextPair(variant.scene, locale),
        count: (current?.count ?? 0) + 1,
      })
    }

    if (variant.objectiveArea !== null) {
      objectiveAreaCounts.set(
        variant.objectiveArea,
        (objectiveAreaCounts.get(variant.objectiveArea) ?? 0) + 1,
      )
    }
  }

  return {
    enemyTypeOptions: Array.from(enemyTypeCounts.entries())
      .map(([id, count]) => ({ id, count, label: getEnemyTypeLabel(id, locale) }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
    sceneOptions: Array.from(sceneCounts.entries())
      .map(([id, value]) => ({ id, label: value.label, count: value.count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
    commonObjectiveAreas: Array.from(objectiveAreaCounts.entries())
      .sort((left, right) => right[1] - left[1] || left[0] - right[0])
      .slice(0, 12)
      .map(([area]) => area)
      .sort((left, right) => left - right),
  }
}

function matchesVariantSearch(variant: Variant, query: string, locale: 'zh-CN' | 'en-US'): boolean {
  if (!query) {
    return true
  }

  return (
    matchesLocalizedText(variant.name, query) ||
    matchesLocalizedText(variant.campaign, query) ||
    (variant.adventure ? matchesLocalizedText(variant.adventure, query) : false) ||
    (variant.scene ? matchesLocalizedText(variant.scene, query) : false) ||
    variant.restrictions.some((item) => matchesLocalizedText(item, query)) ||
    variant.rewards.some((item) => matchesLocalizedText(item, query)) ||
    variant.enemyTypes.some((item) => {
      if (GENERIC_SEARCH_TAGS.has(item)) {
        return false
      }

      return getEnemyTypeLabel(item, locale).toLowerCase().includes(query) || item.includes(query)
    })
  )
}

export function filterVariants(options: {
  variants: Variant[]
  locale: 'zh-CN' | 'en-US'
  search: string
  selectedCampaign: string
  selectedEnemyTypeIds: string[]
  selectedSceneIds: string[]
  selectedAttackProfile: AttackProfileFilterId
  selectedSpecialEnemyRange: SpecialEnemyFilterId
  areaSearch: string
}): Variant[] {
  const {
    variants,
    locale,
    search,
    selectedCampaign,
    selectedEnemyTypeIds,
    selectedSceneIds,
    selectedAttackProfile,
    selectedSpecialEnemyRange,
    areaSearch,
  } = options
  const query = search.trim().toLowerCase()
  const areaNumber = Number(areaSearch.trim())
  const hasAreaFilter = areaSearch.trim().length > 0 && Number.isFinite(areaNumber) && areaNumber > 0

  return variants.filter((variant) => {
    const matchesCampaign =
      selectedCampaign === ALL_CAMPAIGNS || variant.campaign.id === selectedCampaign
    const matchesEnemyTypes =
      selectedEnemyTypeIds.length === 0 ||
      selectedEnemyTypeIds.some((enemyType) => variant.enemyTypes.includes(enemyType))
    const matchesScenes =
      selectedSceneIds.length === 0 ||
      (variant.scene ? selectedSceneIds.includes(variant.scene.id) : false)
    const attackProfile = getAttackProfileId(variant)
    const matchesAttackProfile =
      selectedAttackProfile === '__all__' || attackProfile === selectedAttackProfile
    const specialEnemyRange = getSpecialEnemyRangeId(variant.specialEnemyCount)
    const matchesSpecialEnemyRange =
      selectedSpecialEnemyRange === '__all__' || specialEnemyRange === selectedSpecialEnemyRange
    const matchesArea = !hasAreaFilter || (variant.objectiveArea ?? 0) >= areaNumber

    return (
      matchesCampaign &&
      matchesEnemyTypes &&
      matchesScenes &&
      matchesAttackProfile &&
      matchesSpecialEnemyRange &&
      matchesArea &&
      matchesVariantSearch(variant, query, locale)
    )
  })
}

export function buildActiveVariantFilters(options: {
  locale: 'zh-CN' | 'en-US'
  search: string
  selectedCampaignLabel: LocalizedOption | null
  selectedEnemyTypeIds: string[]
  selectedSceneIds: string[]
  sceneOptions: VariantFilterOption[]
  selectedAttackProfile: AttackProfileFilterId
  selectedSpecialEnemyRange: SpecialEnemyFilterId
  areaSearch: string
}): string[] {
  const {
    locale,
    search,
    selectedCampaignLabel,
    selectedEnemyTypeIds,
    selectedSceneIds,
    sceneOptions,
    selectedAttackProfile,
    selectedSpecialEnemyRange,
    areaSearch,
  } = options

  const sceneLabels = selectedSceneIds
    .map((sceneId) => sceneOptions.find((option) => option.id === sceneId)?.label ?? sceneId)
    .filter(Boolean)

  return [
    search.trim()
      ? locale === 'zh-CN'
        ? `关键词：${search.trim()}`
        : `Keyword: ${search.trim()}`
      : null,
    selectedCampaignLabel
      ? locale === 'zh-CN'
        ? `战役：${getLocalizedTextPair(selectedCampaignLabel, locale)}`
        : `Campaign: ${getLocalizedTextPair(selectedCampaignLabel, locale)}`
      : null,
    selectedEnemyTypeIds.length > 0
      ? locale === 'zh-CN'
        ? `敌人：${selectedEnemyTypeIds.map((item) => getEnemyTypeLabel(item, locale)).join(' / ')}`
        : `Enemy: ${selectedEnemyTypeIds.map((item) => getEnemyTypeLabel(item, locale)).join(' / ')}`
      : null,
    sceneLabels.length > 0
      ? locale === 'zh-CN'
        ? `场景：${sceneLabels.join(' / ')}`
        : `Scene: ${sceneLabels.join(' / ')}`
      : null,
    selectedAttackProfile !== '__all__'
      ? locale === 'zh-CN'
        ? `攻击占比：${getAttackProfileLabel(selectedAttackProfile, locale)}`
        : `Attack mix: ${getAttackProfileLabel(selectedAttackProfile, locale)}`
      : null,
    selectedSpecialEnemyRange !== '__all__'
      ? locale === 'zh-CN'
        ? `特别敌人：${getSpecialEnemyRangeLabel(selectedSpecialEnemyRange, locale)}`
        : `Special enemies: ${getSpecialEnemyRangeLabel(selectedSpecialEnemyRange, locale)}`
      : null,
    areaSearch.trim()
      ? locale === 'zh-CN'
        ? `区域：${areaSearch.trim()} 区`
        : `Area: ${areaSearch.trim()}`
      : null,
  ].filter((item): item is string => item !== null)
}
