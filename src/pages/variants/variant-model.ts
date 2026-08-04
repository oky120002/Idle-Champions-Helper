import { getLocalizedTextPair, matchesLocalizedText } from '../../domain/localizedText'
import type { LocalizedOption, Variant } from '../../domain/types'
import { ALL_CAMPAIGNS } from './constants'
import {
  getAttackProfileLabel,
  getEnemyTypeLabel,
  getSpecialEnemyRangeLabel,
  NON_DISPLAY_ENEMY_TAGS,
} from './variant-labels'
import type {
  AttackProfileFilterId,
  CampaignEnumGroup,
  SpecialEnemyFilterId,
  VariantFilterOption,
} from './types'

export function isCampaignEnumGroup(value: unknown): value is CampaignEnumGroup {
  if (typeof value !== 'object' || value === null) return false
  if (!('id' in value) || value.id !== 'campaigns') return false
  return 'values' in value && Array.isArray(value.values)
}

export function isLocalizedOption(value: unknown): value is LocalizedOption {
  if (typeof value !== 'object' || value === null) return false
  if (!('id' in value) || typeof value.id !== 'string') return false
  if (!('original' in value) || typeof value.original !== 'string') return false
  return 'display' in value && typeof value.display === 'string'
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
      if (NON_DISPLAY_ENEMY_TAGS.has(enemyType)) continue
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

  const matchesCoreText =
    matchesLocalizedText(variant.name, query) ||
    matchesLocalizedText(variant.campaign, query)
  const matchesOptionalText =
    (variant.adventure ? matchesLocalizedText(variant.adventure, query) : false) ||
    (variant.scene ? matchesLocalizedText(variant.scene, query) : false)
  const matchesListText =
    variant.restrictions.some((item) => matchesLocalizedText(item, query)) ||
    variant.rewards.some((item) => matchesLocalizedText(item, query))
  const matchesEnemyTypes = variant.enemyTypes.some((item) => {
    if (NON_DISPLAY_ENEMY_TAGS.has(item)) return false
    return getEnemyTypeLabel(item, locale).toLowerCase().includes(query) || item.includes(query)
  })

  return matchesCoreText || matchesOptionalText || matchesListText || matchesEnemyTypes
}

function variantMatchesFilters(
  variant: Variant,
  ctx: {
    query: string
    locale: 'zh-CN' | 'en-US'
    selectedCampaign: string
    selectedEnemyTypeIds: string[]
    selectedSceneIds: string[]
    selectedAttackProfile: AttackProfileFilterId
    selectedSpecialEnemyRange: SpecialEnemyFilterId
    hasAreaFilter: boolean
    areaNumber: number
  },
): boolean {
  const { query, locale, selectedCampaign, selectedEnemyTypeIds, selectedSceneIds, selectedAttackProfile, selectedSpecialEnemyRange, hasAreaFilter, areaNumber } = ctx
  const matchesCampaign = selectedCampaign === ALL_CAMPAIGNS || variant.campaign.id === selectedCampaign
  const matchesEnemyTypes = selectedEnemyTypeIds.length === 0 || selectedEnemyTypeIds.some((t) => variant.enemyTypes.includes(t))
  const matchesScenes = selectedSceneIds.length === 0 || (variant.scene ? selectedSceneIds.includes(variant.scene.id) : false)
  const matchesAttackProfile = selectedAttackProfile === '__all__' || getAttackProfileId(variant) === selectedAttackProfile
  const matchesSpecialEnemy = selectedSpecialEnemyRange === '__all__' || getSpecialEnemyRangeId(variant.specialEnemyCount) === selectedSpecialEnemyRange
  const matchesArea = !hasAreaFilter || (variant.objectiveArea ?? 0) >= areaNumber
  return [matchesCampaign, matchesEnemyTypes, matchesScenes, matchesAttackProfile, matchesSpecialEnemy, matchesArea, matchesVariantSearch(variant, query, locale)].every(Boolean)
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
  const { variants, locale, search, selectedCampaign, selectedEnemyTypeIds, selectedSceneIds, selectedAttackProfile, selectedSpecialEnemyRange, areaSearch } = options
  const query = search.trim().toLowerCase()
  const areaNumber = Number(areaSearch.trim())
  const hasAreaFilter = areaSearch.trim().length > 0 && Number.isFinite(areaNumber) && areaNumber > 0

  return variants.filter((variant) => variantMatchesFilters(variant, {
    query, locale, selectedCampaign, selectedEnemyTypeIds, selectedSceneIds, selectedAttackProfile, selectedSpecialEnemyRange, hasAreaFilter, areaNumber,
  }))
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

  const enemyTypeList = selectedEnemyTypeIds.map((item) => getEnemyTypeLabel(item, locale)).join(' / ')
  const pick = <T>(zh: T, en: T): T => (locale === 'zh-CN' ? zh : en)
  const trimmedSearch = search.trim()
  const trimmedArea = areaSearch.trim()
  const campaignText = selectedCampaignLabel ? getLocalizedTextPair(selectedCampaignLabel, locale) : null
  const attackProfileText = selectedAttackProfile !== '__all__' ? getAttackProfileLabel(selectedAttackProfile, locale) : null
  const specialEnemyText = selectedSpecialEnemyRange !== '__all__' ? getSpecialEnemyRangeLabel(selectedSpecialEnemyRange, locale) : null

  const labels: (string | null)[] = [
    trimmedSearch ? pick(`关键词：${trimmedSearch}`, `Keyword: ${trimmedSearch}`) : null,
    campaignText !== null ? pick(`战役：${campaignText}`, `Campaign: ${campaignText}`) : null,
    enemyTypeList ? pick(`敌人：${enemyTypeList}`, `Enemy: ${enemyTypeList}`) : null,
    sceneLabels.length > 0 ? pick(`场景：${sceneLabels.join(' / ')}`, `Scene: ${sceneLabels.join(' / ')}`) : null,
    attackProfileText !== null ? pick(`攻击占比：${attackProfileText}`, `Attack mix: ${attackProfileText}`) : null,
    specialEnemyText !== null ? pick(`特别敌人：${specialEnemyText}`, `Special enemies: ${specialEnemyText}`) : null,
    trimmedArea ? pick(`区域：${trimmedArea} 区`, `Area: ${trimmedArea}`) : null,
  ]

  return labels.filter((item): item is string => item !== null)
}
