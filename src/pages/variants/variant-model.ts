import { getLocalizedTextPair, matchesLocalizedText } from '../../domain/localizedText'
import type { LocalizedOption, Variant } from '../../domain/types'
import { ALL_CAMPAIGNS } from './constants'
import type { CampaignEnumGroup } from './types'

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

export function filterVariants(variants: Variant[], search: string, selectedCampaign: string): Variant[] {
  const query = search.trim().toLowerCase()

  return variants.filter((variant) => {
    const matchesCampaign = selectedCampaign === ALL_CAMPAIGNS || variant.campaign.original === selectedCampaign
    const matchesSearch =
      !query ||
      matchesLocalizedText(variant.name, query) ||
      matchesLocalizedText(variant.campaign, query) ||
      variant.restrictions.some((item) => matchesLocalizedText(item, query)) ||
      variant.rewards.some((item) => matchesLocalizedText(item, query))

    return matchesCampaign && matchesSearch
  })
}

export function buildActiveVariantFilters(options: {
  locale: 'zh-CN' | 'en-US'
  search: string
  selectedCampaignLabel: LocalizedOption | null
}): string[] {
  const { locale, search, selectedCampaignLabel } = options

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
  ].filter((item): item is string => item !== null)
}
