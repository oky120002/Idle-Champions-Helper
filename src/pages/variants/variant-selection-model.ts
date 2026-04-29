import type { AppLocale, LocaleText } from '../../app/i18n'
import type { LocalizedOption } from '../../domain/types'
import { buildActiveVariantFilters } from './variant-model'
import type {
  AttackProfileFilterId,
  SpecialEnemyFilterId,
  VariantAdventureGroup,
  VariantCampaignGroup,
  VariantFilterOption,
} from './types'

type VariantTranslator = (text: LocaleText) => string

export function getSelectedCampaignGroup(
  groups: VariantCampaignGroup[],
  selectedCampaign: string,
): VariantCampaignGroup | null {
  if (groups.length === 0) {
    return null
  }

  return groups.find((group) => group.id === selectedCampaign) ?? groups[0] ?? null
}

export function getSelectedAdventureGroup(
  campaignGroup: VariantCampaignGroup | null,
  selectedAdventureId: string,
): VariantAdventureGroup | null {
  if (!campaignGroup) {
    return null
  }

  return (
    campaignGroup.adventures.find((group) => group.adventureId === selectedAdventureId) ??
    campaignGroup.adventures[0] ??
    null
  )
}

export function buildVisibleVariantCampaignGroups(options: {
  campaignGroup: VariantCampaignGroup | null
  adventureGroup: VariantAdventureGroup | null
}): VariantCampaignGroup[] {
  const { campaignGroup, adventureGroup } = options

  if (!campaignGroup || !adventureGroup) {
    return []
  }

  return [
    {
      ...campaignGroup,
      variantCount: adventureGroup.variants.length,
      adventures: [adventureGroup],
    },
  ]
}

export function buildVariantNavigationFilters(options: {
  locale: AppLocale
  t: VariantTranslator
  search: string
  selectedCampaignLabel: LocalizedOption | null
  selectedAdventureGroup: VariantAdventureGroup | null
  selectedEnemyTypeIds: string[]
  selectedSceneIds: string[]
  sceneOptions: VariantFilterOption[]
  selectedAttackProfile: AttackProfileFilterId
  selectedSpecialEnemyRange: SpecialEnemyFilterId
  areaSearch: string
}): string[] {
  const {
    locale,
    t,
    search,
    selectedCampaignLabel,
    selectedAdventureGroup,
    selectedEnemyTypeIds,
    selectedSceneIds,
    sceneOptions,
    selectedAttackProfile,
    selectedSpecialEnemyRange,
    areaSearch,
  } = options

  return [
    ...buildActiveVariantFilters({
      locale,
      search,
      selectedCampaignLabel,
      selectedEnemyTypeIds,
      selectedSceneIds,
      sceneOptions,
      selectedAttackProfile,
      selectedSpecialEnemyRange,
      areaSearch,
    }),
    ...(selectedAdventureGroup
      ? [
          locale === 'zh-CN'
            ? `${t({ zh: '关卡', en: 'Adventure' })}：${selectedAdventureGroup.adventure.display}`
            : `${t({ zh: '关卡', en: 'Adventure' })}: ${selectedAdventureGroup.adventure.original}`,
        ]
      : []),
  ]
}
