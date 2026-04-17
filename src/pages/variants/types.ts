import type { AppLocale, LocaleText } from '../../app/i18n'
import type {
  FormationLayout,
  LocalizedOption,
  Variant,
  VariantAttackMix,
} from '../../domain/types'

export type VariantsPageTranslator = (text: LocaleText) => string

export type AttackProfileFilterId = '__all__' | 'meleeHeavy' | 'rangedThreat' | 'mixed'
export type SpecialEnemyFilterId = '__all__' | 'light' | 'standard' | 'dense'

export type VariantFilterOption = {
  id: string
  label: string
  count: number
}

export type CampaignEnumGroup = {
  id: 'campaigns'
  values: LocalizedOption[]
}

export type VariantState =
  | { status: 'loading' }
  | {
      status: 'ready'
      variants: Variant[]
      campaigns: LocalizedOption[]
      formations: FormationLayout[]
    }
  | {
      status: 'error'
      message: string
    }

export type VariantAdventureGroup = {
  id: string
  campaign: LocalizedOption
  adventureId: string
  adventure: NonNullable<Variant['adventure']>
  scene: LocalizedOption | null
  objectiveAreas: number[]
  formation: FormationLayout | null
  enemyTypes: string[]
  attackMix: VariantAttackMix
  specialEnemyMin: number
  specialEnemyMax: number
  areaMilestones: number[]
  variants: Variant[]
}

export type VariantCampaignGroup = {
  id: string
  campaign: LocalizedOption
  variantCount: number
  adventures: VariantAdventureGroup[]
}

export type VariantsPageModel = {
  locale: AppLocale
  t: VariantsPageTranslator
  state: VariantState
  search: string
  selectedCampaign: string
  selectedSceneIds: string[]
  selectedEnemyTypeIds: string[]
  selectedAttackProfile: AttackProfileFilterId
  selectedSpecialEnemyRange: SpecialEnemyFilterId
  areaSearch: string
  showAllResults: boolean
  filteredVariants: Variant[]
  visibleVariants: Variant[]
  visibleCampaignGroups: VariantCampaignGroup[]
  campaignsWithResults: number
  adventuresWithResults: number
  scenesWithResults: number
  activeFilters: string[]
  selectedCampaignLabel: LocalizedOption | null
  enemyTypeOptions: VariantFilterOption[]
  sceneOptions: VariantFilterOption[]
  commonObjectiveAreas: number[]
  canToggleResultVisibility: boolean
  updateSearch: (value: string) => void
  updateSelectedCampaign: (value: string) => void
  updateAreaSearch: (value: string) => void
  updateAttackProfile: (value: AttackProfileFilterId) => void
  updateSpecialEnemyRange: (value: SpecialEnemyFilterId) => void
  resetEnemyTypes: () => void
  toggleEnemyType: (value: string) => void
  resetScenes: () => void
  toggleScene: (value: string) => void
  clearAllFilters: () => void
  toggleResultVisibility: () => void
}
