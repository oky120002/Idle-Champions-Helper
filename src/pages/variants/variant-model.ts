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
  if (!('values' in value)) return false
  return Array.isArray(value.values)
}

export function isLocalizedOption(value: unknown): value is LocalizedOption {
  if (typeof value !== 'object' || value === null) return false
  if (!('id' in value) || typeof value.id !== 'string') return false
  if (!('original' in value) || typeof value.original !== 'string') return false
  if (!('display' in value) || typeof value.display !== 'string') return false
  return true
}

export function toggleVariantSelection(values: string[], nextValue: string): string[] {
  return values.includes(nextValue)
    ? values.filter((value) => value !== nextValue)
    : [...values, nextValue]
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
      .sort((left, right) => compareByCountThenLabel(left, right)),
    sceneOptions: Array.from(sceneCounts.entries())
      .map(([id, value]) => ({ id, label: value.label, count: value.count }))
      .sort((left, right) => compareByCountThenLabel(left, right)),
    commonObjectiveAreas: Array.from(objectiveAreaCounts.entries())
      .sort((left, right) => {
        const diff = right[1] - left[1]
        if (diff !== 0) return diff
        return left[0] - right[0]
      })
      .slice(0, 12)
      .map(([area]) => area)
      .sort((left, right) => left - right),
  }
}

function compareByCountThenLabel<T extends { count: number; label: string }>(left: T, right: T): number {
  const diff = right.count - left.count
  if (diff !== 0) return diff
  return left.label.localeCompare(right.label)
}

function matchesVariantSearch(variant: Variant, query: string, locale: 'zh-CN' | 'en-US'): boolean {
  if (query === '') {
    return true
  }

  if (matchesLocalizedText(variant.name, query)) return true
  if (matchesLocalizedText(variant.campaign, query)) return true
  if (variant.adventure != null && matchesLocalizedText(variant.adventure, query)) return true
  if (variant.scene != null && matchesLocalizedText(variant.scene, query)) return true
  if (variant.restrictions.some((item) => matchesLocalizedText(item, query))) return true
  if (variant.rewards.some((item) => matchesLocalizedText(item, query))) return true

  return variant.enemyTypes.some((item) => {
    if (NON_DISPLAY_ENEMY_TAGS.has(item)) return false
    return getEnemyTypeLabel(item, locale).toLowerCase().includes(query) || item.includes(query)
  })
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
  const { variants, locale, search, selectedCampaign, selectedEnemyTypeIds,
    selectedSceneIds, selectedAttackProfile, selectedSpecialEnemyRange, areaSearch } = options
  const query = search.trim().toLowerCase()
  const areaNumber = Number(areaSearch.trim())
  const hasAreaFilter = areaSearch.trim().length > 0 && Number.isFinite(areaNumber) && areaNumber > 0

  return variants.filter((variant) =>
    variantMatchesFilters(variant, {
      locale, query, selectedCampaign, selectedEnemyTypeIds,
      selectedSceneIds, selectedAttackProfile, selectedSpecialEnemyRange,
      hasAreaFilter, areaNumber,
    }),
  )
}

type VariantFilterContext = {
  locale: 'zh-CN' | 'en-US'
  query: string
  selectedCampaign: string
  selectedEnemyTypeIds: string[]
  selectedSceneIds: string[]
  selectedAttackProfile: AttackProfileFilterId
  selectedSpecialEnemyRange: SpecialEnemyFilterId
  hasAreaFilter: boolean
  areaNumber: number
}

function variantMatchesFilters(variant: Variant, ctx: VariantFilterContext): boolean {
  const { selectedCampaign, selectedEnemyTypeIds, selectedSceneIds, selectedAttackProfile,
    selectedSpecialEnemyRange, hasAreaFilter, areaNumber, query, locale } = ctx
  if (selectedCampaign !== ALL_CAMPAIGNS && variant.campaign.id !== selectedCampaign) return false
  if (selectedEnemyTypeIds.length !== 0 && !selectedEnemyTypeIds.some((enemyType) => variant.enemyTypes.includes(enemyType))) return false
  if (selectedSceneIds.length !== 0 && (variant.scene == null || !selectedSceneIds.includes(variant.scene.id))) return false
  if (selectedAttackProfile !== '__all__' && getAttackProfileId(variant) !== selectedAttackProfile) return false
  if (selectedSpecialEnemyRange !== '__all__' && getSpecialEnemyRangeId(variant.specialEnemyCount) !== selectedSpecialEnemyRange) return false
  if (hasAreaFilter && (variant.objectiveArea ?? 0) < areaNumber) return false
  return matchesVariantSearch(variant, query, locale)
}

function pickByLocale(locale: 'zh-CN' | 'en-US', zh: string, en: string): string {
  return locale === 'zh-CN' ? zh : en
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
  const { locale, search, selectedCampaignLabel, selectedEnemyTypeIds,
    selectedSceneIds, sceneOptions, selectedAttackProfile,
    selectedSpecialEnemyRange, areaSearch } = options

  const labels: string[] = []

  const trimmedSearch = search.trim()
  if (trimmedSearch !== '') {
    labels.push(pickByLocale(locale, `关键词：${trimmedSearch}`, `Keyword: ${trimmedSearch}`))
  }

  if (selectedCampaignLabel != null) {
    const text = getLocalizedTextPair(selectedCampaignLabel, locale)
    labels.push(pickByLocale(locale, `战役：${text}`, `Campaign: ${text}`))
  }

  if (selectedEnemyTypeIds.length > 0) {
    const text = selectedEnemyTypeIds.map((item) => getEnemyTypeLabel(item, locale)).join(' / ')
    labels.push(pickByLocale(locale, `敌人：${text}`, `Enemy: ${text}`))
  }

  const sceneLabels = selectedSceneIds
    .map((sceneId) => sceneOptions.find((option) => option.id === sceneId)?.label ?? sceneId)
    .filter(Boolean)
  if (sceneLabels.length > 0) {
    const text = sceneLabels.join(' / ')
    labels.push(pickByLocale(locale, `场景：${text}`, `Scene: ${text}`))
  }

  if (selectedAttackProfile !== '__all__') {
    const text = getAttackProfileLabel(selectedAttackProfile, locale)
    labels.push(pickByLocale(locale, `攻击占比：${text}`, `Attack mix: ${text}`))
  }

  if (selectedSpecialEnemyRange !== '__all__') {
    const text = getSpecialEnemyRangeLabel(selectedSpecialEnemyRange, locale)
    labels.push(pickByLocale(locale, `特别敌人：${text}`, `Special enemies: ${text}`))
  }

  const trimmedArea = areaSearch.trim()
  if (trimmedArea !== '') {
    labels.push(pickByLocale(locale, `区域：${trimmedArea} 区`, `Area: ${trimmedArea}`))
  }

  return labels
}
