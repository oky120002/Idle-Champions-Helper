import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useI18n } from '../../app/i18n'
import { useWorkbenchResultsMotion } from '../../components/filter-sidebar/useWorkbenchResultsMotion'
import { useWorkbenchShareLink } from '../../components/filter-sidebar/useWorkbenchShareLink'
import { ALL_CAMPAIGNS, MAX_VISIBLE_VARIANTS } from './constants'
import { buildVariantsFilterSearchParams, readInitialVariantsFilterState } from './query-state'
import {
  buildActiveVariantFilters,
  buildVariantOptions,
  filterVariants,
  toggleVariantSelection,
} from './variant-model'
import { groupVariantsByCampaign } from './variant-grouping'
import type { AttackProfileFilterId, SpecialEnemyFilterId, VariantsFilterState, VariantsPageModel } from './types'
import { useVariantCollectionState } from './useVariantCollectionState'

export function useVariantsPageModel(): VariantsPageModel {
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  const { locale, t } = useI18n()
  const state = useVariantCollectionState()
  const initialFilters = useMemo(() => readInitialVariantsFilterState(location.search), [location.search])
  const normalizedLocationSearch = useMemo(
    () => new URLSearchParams(location.search).toString(),
    [location.search],
  )
  const lastAppliedLocationSearchRef = useRef(normalizedLocationSearch)
  const pendingLocationSyncSearchRef = useRef<string | null>(null)

  const [search, setSearch] = useState(initialFilters.search)
  const [selectedCampaign, setSelectedCampaign] = useState(initialFilters.selectedCampaign)
  const [selectedSceneIds, setSelectedSceneIds] = useState(initialFilters.selectedSceneIds)
  const [selectedEnemyTypeIds, setSelectedEnemyTypeIds] = useState(initialFilters.selectedEnemyTypeIds)
  const [selectedAttackProfile, setSelectedAttackProfile] = useState<AttackProfileFilterId>(initialFilters.selectedAttackProfile)
  const [selectedSpecialEnemyRange, setSelectedSpecialEnemyRange] = useState<SpecialEnemyFilterId>(
    initialFilters.selectedSpecialEnemyRange,
  )
  const [areaSearch, setAreaSearch] = useState(initialFilters.areaSearch)
  const [showAllResults, setShowAllResults] = useState(initialFilters.showAllResults)

  const filters = useMemo<VariantsFilterState>(
    () => ({
      search,
      selectedCampaign,
      selectedSceneIds,
      selectedEnemyTypeIds,
      selectedAttackProfile,
      selectedSpecialEnemyRange,
      areaSearch,
      showAllResults,
    }),
    [
      areaSearch,
      search,
      selectedAttackProfile,
      selectedCampaign,
      selectedEnemyTypeIds,
      selectedSceneIds,
      selectedSpecialEnemyRange,
      showAllResults,
    ],
  )
  const transitionKey = useMemo(() => buildVariantsFilterSearchParams(filters).toString(), [filters])

  useLayoutEffect(() => {
    if (normalizedLocationSearch === lastAppliedLocationSearchRef.current) {
      return
    }

    lastAppliedLocationSearchRef.current = normalizedLocationSearch
    const currentFilterSearch = buildVariantsFilterSearchParams(filters).toString()

    if (currentFilterSearch === normalizedLocationSearch) {
      pendingLocationSyncSearchRef.current = null
      return
    }

    const nextFilters = readInitialVariantsFilterState(location.search)
    pendingLocationSyncSearchRef.current = normalizedLocationSearch
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled || pendingLocationSyncSearchRef.current !== normalizedLocationSearch) {
        return
      }

      setSearch(nextFilters.search)
      setSelectedCampaign(nextFilters.selectedCampaign)
      setSelectedSceneIds(nextFilters.selectedSceneIds)
      setSelectedEnemyTypeIds(nextFilters.selectedEnemyTypeIds)
      setSelectedAttackProfile(nextFilters.selectedAttackProfile)
      setSelectedSpecialEnemyRange(nextFilters.selectedSpecialEnemyRange)
      setAreaSearch(nextFilters.areaSearch)
      setShowAllResults(nextFilters.showAllResults)
    })

    return () => {
      cancelled = true
    }
  }, [filters, location.search, normalizedLocationSearch])

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
  const motion = useWorkbenchResultsMotion({
    storageKey: 'variants',
    locationSearch: location.search,
    stateStatus: state.status,
    filteredCount: filteredVariants.length,
    visibleCount: visibleVariants.length,
    showAllResults,
    transitionKey,
  })
  const { shareLinkState, copyCurrentLink } = useWorkbenchShareLink(location.pathname, location.search, location.hash)
  const shareButtonLabel =
    shareLinkState === 'success'
      ? t({ zh: '已复制链接', en: 'Link copied' })
      : shareLinkState === 'error'
        ? t({ zh: '复制失败', en: 'Copy failed' })
        : t({ zh: '复制当前链接', en: 'Copy current link' })

  const runFilterMutation = (mutation: () => void) => {
    motion.prepareResultsViewportTransition('filters')
    setShowAllResults(false)
    mutation()
  }

  useEffect(() => {
    const nextSearchParams = buildVariantsFilterSearchParams(filters)
    const nextSearch = nextSearchParams.toString()
    const currentSearch = new URLSearchParams(location.search).toString()
    const pendingLocationSyncSearch = pendingLocationSyncSearchRef.current

    if (pendingLocationSyncSearch !== null && currentSearch === pendingLocationSyncSearch) {
      if (nextSearch === currentSearch) {
        pendingLocationSyncSearchRef.current = null
      }

      return
    }

    if (nextSearch !== currentSearch) {
      setSearchParams(nextSearchParams, { replace: true })
    }
  }, [filters, location.search, setSearchParams])

  return {
    locale,
    t,
    state,
    filters,
    shareLinkState,
    shareButtonLabel,
    showResultsQuickNavTop: motion.showResultsQuickNavTop,
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
    resultsPaneRef: motion.resultsPaneRef,
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
      motion.prepareResultsViewportTransition('filters')
      setShowAllResults(false)
      setSearch('')
      setSelectedCampaign(ALL_CAMPAIGNS)
      setSelectedSceneIds([])
      setSelectedEnemyTypeIds([])
      setSelectedAttackProfile('__all__')
      setSelectedSpecialEnemyRange('__all__')
      setAreaSearch('')
    },
    toggleResultVisibility: () => {
      motion.prepareResultsViewportTransition('visibility')
      setShowAllResults((current) => !current)
    },
    scrollResultsToTop: motion.scrollResultsToTop,
    copyCurrentLink,
  }
}
