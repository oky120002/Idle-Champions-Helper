import { useMemo, useState } from 'react'
import { useI18n } from '../../app/i18n'
import { ALL_CAMPAIGNS, MAX_VISIBLE_VARIANTS } from './constants'
import {
  buildActiveVariantFilters,
  buildVariantOptions,
  filterVariants,
  toggleVariantSelection,
} from './variant-model'
import { groupVariantsByCampaign } from './variant-grouping'
import type { AttackProfileFilterId, SpecialEnemyFilterId, VariantsPageModel } from './types'
import { useVariantCollectionState } from './useVariantCollectionState'

export function useVariantsPageModel(): VariantsPageModel {
  const { locale, t } = useI18n()
  const state = useVariantCollectionState()
  const [search, setSearch] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState(ALL_CAMPAIGNS)
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([])
  const [selectedEnemyTypeIds, setSelectedEnemyTypeIds] = useState<string[]>([])
  const [selectedAttackProfile, setSelectedAttackProfile] = useState<AttackProfileFilterId>('__all__')
  const [selectedSpecialEnemyRange, setSelectedSpecialEnemyRange] = useState<SpecialEnemyFilterId>('__all__')
  const [areaSearch, setAreaSearch] = useState('')
  const [showAllResults, setShowAllResults] = useState(false)

  function runFilterMutation(mutation: () => void) {
    setShowAllResults(false)
    mutation()
  }

  const optionState = useMemo(
    () =>
      state.status === 'ready'
        ? buildVariantOptions({ locale, variants: state.variants })
        : { enemyTypeOptions: [], sceneOptions: [], commonObjectiveAreas: [] },
    [locale, state],
  )

  const filteredVariants = useMemo(
    () =>
      state.status === 'ready'
        ? filterVariants({
            variants: state.variants,
            locale,
            search,
            selectedCampaign,
            selectedEnemyTypeIds,
            selectedSceneIds,
            selectedAttackProfile,
            selectedSpecialEnemyRange,
            areaSearch,
          })
        : [],
    [
      areaSearch,
      locale,
      search,
      selectedAttackProfile,
      selectedCampaign,
      selectedEnemyTypeIds,
      selectedSceneIds,
      selectedSpecialEnemyRange,
      state,
    ],
  )

  const visibleVariants = useMemo(
    () => (showAllResults ? filteredVariants : filteredVariants.slice(0, MAX_VISIBLE_VARIANTS)),
    [filteredVariants, showAllResults],
  )

  const visibleCampaignGroups = useMemo(
    () =>
      state.status === 'ready'
        ? groupVariantsByCampaign({ variants: visibleVariants, formations: state.formations })
        : [],
    [state, visibleVariants],
  )

  const campaignsWithResults = useMemo(
    () => new Set(filteredVariants.map((variant) => variant.campaign.id)).size,
    [filteredVariants],
  )
  const adventuresWithResults = useMemo(
    () => new Set(filteredVariants.map((variant) => variant.adventureId ?? variant.id)).size,
    [filteredVariants],
  )
  const scenesWithResults = useMemo(
    () => new Set(filteredVariants.map((variant) => variant.scene?.id).filter(Boolean)).size,
    [filteredVariants],
  )
  const selectedCampaignLabel =
    state.status === 'ready' && selectedCampaign !== ALL_CAMPAIGNS
      ? state.campaigns.find((campaign) => campaign.id === selectedCampaign) ?? null
      : null
  const activeFilters = buildActiveVariantFilters({
    locale,
    search,
    selectedCampaignLabel,
    selectedEnemyTypeIds,
    selectedSceneIds,
    sceneOptions: optionState.sceneOptions,
    selectedAttackProfile,
    selectedSpecialEnemyRange,
    areaSearch,
  })
  const canToggleResultVisibility = filteredVariants.length > MAX_VISIBLE_VARIANTS

  return {
    locale,
    t,
    state,
    search,
    selectedCampaign,
    selectedSceneIds,
    selectedEnemyTypeIds,
    selectedAttackProfile,
    selectedSpecialEnemyRange,
    areaSearch,
    showAllResults,
    filteredVariants,
    visibleVariants,
    visibleCampaignGroups,
    campaignsWithResults,
    adventuresWithResults,
    scenesWithResults,
    activeFilters,
    selectedCampaignLabel,
    enemyTypeOptions: optionState.enemyTypeOptions,
    sceneOptions: optionState.sceneOptions,
    commonObjectiveAreas: optionState.commonObjectiveAreas,
    canToggleResultVisibility,
    updateSearch: (value) => runFilterMutation(() => setSearch(value)),
    updateSelectedCampaign: (value) => runFilterMutation(() => setSelectedCampaign(value)),
    updateAreaSearch: (value) => runFilterMutation(() => setAreaSearch(value)),
    updateAttackProfile: (value) => runFilterMutation(() => setSelectedAttackProfile(value)),
    updateSpecialEnemyRange: (value) => runFilterMutation(() => setSelectedSpecialEnemyRange(value)),
    resetEnemyTypes: () => runFilterMutation(() => setSelectedEnemyTypeIds([])),
    toggleEnemyType: (value) =>
      runFilterMutation(() => setSelectedEnemyTypeIds((current) => toggleVariantSelection(current, value))),
    resetScenes: () => runFilterMutation(() => setSelectedSceneIds([])),
    toggleScene: (value) =>
      runFilterMutation(() => setSelectedSceneIds((current) => toggleVariantSelection(current, value))),
    clearAllFilters: () => {
      setShowAllResults(false)
      setSearch('')
      setSelectedCampaign(ALL_CAMPAIGNS)
      setSelectedSceneIds([])
      setSelectedEnemyTypeIds([])
      setSelectedAttackProfile('__all__')
      setSelectedSpecialEnemyRange('__all__')
      setAreaSearch('')
    },
    toggleResultVisibility: () => setShowAllResults((current) => !current),
  }
}
