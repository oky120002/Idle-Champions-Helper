import type { AppLocale, LocaleText } from '../../app/i18n'
import type { LocalizedOption, Variant } from '../../domain/types'

export type VariantsPageTranslator = (text: LocaleText) => string

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
    }
  | {
      status: 'error'
      message: string
    }

export type VariantsPageModel = {
  locale: AppLocale
  t: VariantsPageTranslator
  state: VariantState
  search: string
  selectedCampaign: string
  filteredVariants: Variant[]
  visibleVariants: Variant[]
  campaignsWithResults: number
  activeFilters: string[]
  selectedCampaignLabel: LocalizedOption | null
  updateSearch: (value: string) => void
  updateSelectedCampaign: (value: string) => void
}
