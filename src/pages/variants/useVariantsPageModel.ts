import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useI18n } from '../../app/i18n'
import { useWorkbenchResultsMotion } from '../../components/workbench/useWorkbenchResultsMotion'
import { useWorkbenchShareLink } from '../../components/workbench/useWorkbenchShareLink'
import { ALL_CAMPAIGNS, MAX_VISIBLE_VARIANTS } from './constants'
import { buildVariantsFilterSearchParams, readInitialVariantsFilterState } from './query-state'
import {
  buildVariantOptions,
  toggleVariantSelection,
} from './variant-model'
import { groupVariantsByCampaign } from './variant-grouping'
import {
  buildVariantNavigationFilters,
  buildVisibleVariantCampaignGroups,
  getSelectedAdventureGroup,
  getSelectedCampaignGroup,
} from './variant-selection-model'
import type {
  AttackProfileFilterId,
  SpecialEnemyFilterId,
  VariantDetailTabId,
  VariantsFilterState,
  VariantsPageModel,
} from './types'
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
  const [selectedAdventureId, setSelectedAdventureId] = useState(initialFilters.selectedAdventureId)
  const [selectedSceneIds, setSelectedSceneIds] = useState(initialFilters.selectedSceneIds)
  const [selectedEnemyTypeIds, setSelectedEnemyTypeIds] = useState(initialFilters.selectedEnemyTypeIds)
  const [selectedAttackProfile, setSelectedAttackProfile] = useState<AttackProfileFilterId>(initialFilters.selectedAttackProfile)
  const [selectedSpecialEnemyRange, setSelectedSpecialEnemyRange] = useState<SpecialEnemyFilterId>(
    initialFilters.selectedSpecialEnemyRange,
  )
  const [areaSearch, setAreaSearch] = useState(initialFilters.areaSearch)
  const [showAllResults, setShowAllResults] = useState(initialFilters.showAllResults)
  const [detailTab, setDetailTab] = useState<VariantDetailTabId>(initialFilters.detailTab)

  const filters = useMemo<VariantsFilterState>(
    () => ({
      search,
      selectedCampaign,
      selectedAdventureId,
      selectedSceneIds,
      selectedEnemyTypeIds,
      selectedAttackProfile,
      selectedSpecialEnemyRange,
      areaSearch,
      showAllResults,
      detailTab,
    }),
    [
      areaSearch,
      detailTab,
      search,
      selectedAttackProfile,
      selectedAdventureId,
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
      setSelectedAdventureId(nextFilters.selectedAdventureId)
      setSelectedSceneIds(nextFilters.selectedSceneIds)
      setSelectedEnemyTypeIds(nextFilters.selectedEnemyTypeIds)
      setSelectedAttackProfile(nextFilters.selectedAttackProfile)
      setSelectedSpecialEnemyRange(nextFilters.selectedSpecialEnemyRange)
      setAreaSearch(nextFilters.areaSearch)
      setShowAllResults(nextFilters.showAllResults)
      setDetailTab(nextFilters.detailTab)
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

  const allCampaignGroups = useMemo(
    () =>
      state.status === 'ready'
        ? groupVariantsByCampaign({ variants: state.variants, formations: state.formations })
        : [],
    [state],
  )
  const selectedCampaignGroup = useMemo(
    () => getSelectedCampaignGroup(allCampaignGroups, selectedCampaign),
    [allCampaignGroups, selectedCampaign],
  )
  const selectedAdventureGroup = useMemo(
    () => getSelectedAdventureGroup(selectedCampaignGroup, selectedAdventureId),
    [selectedAdventureId, selectedCampaignGroup],
  )

  const filteredVariants = useMemo(
    () => selectedAdventureGroup?.variants ?? [],
    [selectedAdventureGroup],
  )

  const visibleVariants = useMemo(
    () => (showAllResults ? filteredVariants : filteredVariants.slice(0, MAX_VISIBLE_VARIANTS)),
    [filteredVariants, showAllResults],
  )

  const visibleCampaignGroups = useMemo(
    () =>
      buildVisibleVariantCampaignGroups({
        campaignGroup: selectedCampaignGroup,
        adventureGroup: selectedAdventureGroup,
      }),
    [selectedAdventureGroup, selectedCampaignGroup],
  )

  const campaignsWithResults = useMemo(
    () => allCampaignGroups.length,
    [allCampaignGroups],
  )
  const adventuresWithResults = useMemo(
    () => selectedCampaignGroup?.adventures.length ?? 0,
    [selectedCampaignGroup],
  )
  const scenesWithResults = useMemo(
    () => new Set(filteredVariants.map((variant) => variant.scene?.id).filter(Boolean)).size,
    [filteredVariants],
  )
  const selectedCampaignLabel =
    state.status === 'ready' && selectedCampaignGroup
      ? selectedCampaignGroup.campaign
      : null
  const activeFilters = buildVariantNavigationFilters({
    locale,
    t,
    search,
    selectedCampaignLabel,
    selectedAdventureGroup,
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
    showResultsQuickNavTop: motion.showResultsQuickNavTop,
    filteredVariants,
    visibleVariants,
    allCampaignGroups,
    visibleCampaignGroups,
    selectedCampaignGroup,
    selectedAdventureGroup,
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
    selectCampaign: (value) =>
      runFilterMutation(() => {
        const nextCampaign = allCampaignGroups.find((group) => group.id === value)
        setSelectedCampaign(value)
        setSelectedAdventureId(nextCampaign?.adventures[0]?.adventureId ?? '')
      }),
    selectAdventure: (value) => runFilterMutation(() => setSelectedAdventureId(value)),
    selectAdventureTarget: (target) =>
      runFilterMutation(() => {
        setSelectedCampaign(target.campaignId)
        setSelectedAdventureId(target.adventureId)
      }),
    selectDetailTab: (value) => {
      motion.prepareResultsViewportTransition('filters')
      setDetailTab(value)
    },
    updateSearch: (value) => runFilterMutation(() => setSearch(value)),
    updateSelectedCampaign: (value) =>
      runFilterMutation(() => {
        const nextCampaign = allCampaignGroups.find((group) => group.id === value)
        setSelectedCampaign(value)
        setSelectedAdventureId(nextCampaign?.adventures[0]?.adventureId ?? '')
      }),
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
      setSelectedAdventureId('')
      setSelectedSceneIds([])
      setSelectedEnemyTypeIds([])
      setSelectedAttackProfile('__all__')
      setSelectedSpecialEnemyRange('__all__')
      setAreaSearch('')
      setDetailTab('variants')
    },
    toggleResultVisibility: () => {
      motion.prepareResultsViewportTransition('visibility')
      setShowAllResults((current) => !current)
    },
    scrollResultsToTop: motion.scrollResultsToTop,
    copyCurrentLink,
  }
}
