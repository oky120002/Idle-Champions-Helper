import { useMemo, useState } from 'react'
import { useI18n } from '../../app/i18n'
import { MAX_VISIBLE_VARIANTS } from './constants'
import { buildActiveVariantFilters, filterVariants } from './variant-model'
import type { VariantsPageModel } from './types'
import { useVariantCollectionState } from './useVariantCollectionState'

export function useVariantsPageModel(): VariantsPageModel {
  const { locale, t } = useI18n()
  const state = useVariantCollectionState()
  const [search, setSearch] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState('__all__')

  const filteredVariants = useMemo(
    () => (state.status === 'ready' ? filterVariants(state.variants, search, selectedCampaign) : []),
    [search, selectedCampaign, state],
  )
  const visibleVariants = filteredVariants.slice(0, MAX_VISIBLE_VARIANTS)
  const campaignsWithResults = useMemo(
    () => new Set(filteredVariants.map((variant) => variant.campaign.original)).size,
    [filteredVariants],
  )
  const selectedCampaignLabel =
    state.status === 'ready'
      ? state.campaigns.find((campaign) => campaign.original === selectedCampaign) ?? null
      : null
  const activeFilters = buildActiveVariantFilters({
    locale,
    search,
    selectedCampaignLabel,
  })

  return {
    locale,
    t,
    state,
    search,
    selectedCampaign,
    filteredVariants,
    visibleVariants,
    campaignsWithResults,
    activeFilters,
    selectedCampaignLabel,
    updateSearch: setSearch,
    updateSelectedCampaign: setSelectedCampaign,
  }
}
