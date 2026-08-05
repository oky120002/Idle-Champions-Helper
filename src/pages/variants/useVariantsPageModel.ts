import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useI18n, type AppLocale } from '../../app/i18n'
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
  VariantCampaignGroup,
  VariantDetailTabId,
  VariantState,
  VariantsFilterState,
  VariantsPageModel,
} from './types'
import { useVariantCollectionState } from './useVariantCollectionState'

type FilterStateApi = ReturnType<typeof useVariantsFilterState>
type MotionApi = ReturnType<typeof useWorkbenchResultsMotion>
type DerivedApi = ReturnType<typeof useVariantsDerivedData>
type ShareLinkApi = ReturnType<typeof useWorkbenchShareLink>

function useVariantsFilterState(initial: VariantsFilterState) {
  const [search, setSearch] = useState(initial.search)
  const [selectedCampaign, setSelectedCampaign] = useState(initial.selectedCampaign)
  const [selectedAdventureId, setSelectedAdventureId] = useState(initial.selectedAdventureId)
  const [selectedSceneIds, setSelectedSceneIds] = useState(initial.selectedSceneIds)
  const [selectedEnemyTypeIds, setSelectedEnemyTypeIds] = useState(initial.selectedEnemyTypeIds)
  const [selectedAttackProfile, setSelectedAttackProfile] = useState<AttackProfileFilterId>(initial.selectedAttackProfile)
  const [selectedSpecialEnemyRange, setSelectedSpecialEnemyRange] = useState<SpecialEnemyFilterId>(initial.selectedSpecialEnemyRange)
  const [areaSearch, setAreaSearch] = useState(initial.areaSearch)
  const [showAllResults, setShowAllResults] = useState(initial.showAllResults)
  const [detailTab, setDetailTab] = useState<VariantDetailTabId>(initial.detailTab)
  const filters = useMemo<VariantsFilterState>(() => ({
    search, selectedCampaign, selectedAdventureId, selectedSceneIds, selectedEnemyTypeIds,
    selectedAttackProfile, selectedSpecialEnemyRange, areaSearch, showAllResults, detailTab,
  }), [areaSearch, detailTab, search, selectedAttackProfile, selectedAdventureId, selectedCampaign, selectedEnemyTypeIds, selectedSceneIds, selectedSpecialEnemyRange, showAllResults])
  const applyNextFilters = useCallback((next: VariantsFilterState) => {
    setSearch(next.search); setSelectedCampaign(next.selectedCampaign); setSelectedAdventureId(next.selectedAdventureId)
    setSelectedSceneIds(next.selectedSceneIds); setSelectedEnemyTypeIds(next.selectedEnemyTypeIds)
    setSelectedAttackProfile(next.selectedAttackProfile); setSelectedSpecialEnemyRange(next.selectedSpecialEnemyRange)
    setAreaSearch(next.areaSearch); setShowAllResults(next.showAllResults); setDetailTab(next.detailTab)
  }, [])
  return {
    search, selectedCampaign, selectedAdventureId, selectedSceneIds, selectedEnemyTypeIds,
    selectedAttackProfile, selectedSpecialEnemyRange, areaSearch, showAllResults, detailTab,
    setSearch, setSelectedCampaign, setSelectedAdventureId, setSelectedSceneIds, setSelectedEnemyTypeIds,
    setSelectedAttackProfile, setSelectedSpecialEnemyRange, setAreaSearch, setShowAllResults, setDetailTab,
    filters, applyNextFilters,
  }
}
function useVariantsLocationSync({ filters, locationSearch, normalizedLocationSearch,
  lastAppliedLocationSearchRef, pendingLocationSyncSearchRef, applyNextFilters, setSearchParams,
}: {
  filters: VariantsFilterState; locationSearch: string; normalizedLocationSearch: string
  lastAppliedLocationSearchRef: RefObject<string>; pendingLocationSyncSearchRef: RefObject<string | null>
  applyNextFilters: (next: VariantsFilterState) => void; setSearchParams: ReturnType<typeof useSearchParams>[1]
}) {
  useLayoutEffect(() => {
    if (normalizedLocationSearch === lastAppliedLocationSearchRef.current) {
      return () => {}
    }
    lastAppliedLocationSearchRef.current = normalizedLocationSearch
    const currentFilterSearch = buildVariantsFilterSearchParams(filters).toString()
    if (currentFilterSearch === normalizedLocationSearch) {
      pendingLocationSyncSearchRef.current = null
      return () => {}
    }
    const nextFilters = readInitialVariantsFilterState(locationSearch)
    pendingLocationSyncSearchRef.current = normalizedLocationSearch
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled || pendingLocationSyncSearchRef.current !== normalizedLocationSearch) {
        return
      }
      applyNextFilters(nextFilters)
    })
    return () => {
      cancelled = true
    }
  }, [filters, locationSearch, normalizedLocationSearch, applyNextFilters, lastAppliedLocationSearchRef, pendingLocationSyncSearchRef])
  useEffect(() => {
    const nextSearchParams = buildVariantsFilterSearchParams(filters)
    const nextSearch = nextSearchParams.toString()
    const currentSearch = new URLSearchParams(locationSearch).toString()
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
  }, [filters, locationSearch, setSearchParams, pendingLocationSyncSearchRef])
}
function useVariantsDerivedData({ locale, state, selectedCampaign, selectedAdventureId, showAllResults }: {
  locale: AppLocale; state: VariantState; selectedCampaign: string
  selectedAdventureId: string; showAllResults: boolean
}) {
  const optionState = useMemo(() => state.status === 'ready'
    ? buildVariantOptions({ locale, variants: state.variants })
    : { enemyTypeOptions: [], sceneOptions: [], commonObjectiveAreas: [] }, [locale, state])
  const allCampaignGroups = useMemo(() => state.status === 'ready'
    ? groupVariantsByCampaign({ variants: state.variants, formations: state.formations }) : [], [state])
  const selectedCampaignGroup = useMemo(() => getSelectedCampaignGroup(allCampaignGroups, selectedCampaign), [allCampaignGroups, selectedCampaign])
  const selectedAdventureGroup = useMemo(() => getSelectedAdventureGroup(selectedCampaignGroup, selectedAdventureId), [selectedAdventureId, selectedCampaignGroup])
  const filteredVariants = useMemo(() => selectedAdventureGroup?.variants ?? [], [selectedAdventureGroup])
  const visibleVariants = useMemo(
    () => (showAllResults ? filteredVariants : filteredVariants.slice(0, MAX_VISIBLE_VARIANTS)),
    [filteredVariants, showAllResults],
  )
  const visibleCampaignGroups = useMemo(
    () => buildVisibleVariantCampaignGroups({ campaignGroup: selectedCampaignGroup, adventureGroup: selectedAdventureGroup }),
    [selectedAdventureGroup, selectedCampaignGroup],
  )
  const campaignsWithResults = useMemo(() => allCampaignGroups.length, [allCampaignGroups])
  const adventuresWithResults = useMemo(() => selectedCampaignGroup?.adventures.length ?? 0, [selectedCampaignGroup])
  const scenesWithResults = useMemo(
    () => new Set(filteredVariants.map((variant) => variant.scene?.id).filter(Boolean)).size, [filteredVariants],
  )
  return {
    optionState, allCampaignGroups, selectedCampaignGroup, selectedAdventureGroup,
    filteredVariants, visibleVariants, visibleCampaignGroups,
    campaignsWithResults, adventuresWithResults, scenesWithResults,
  }
}
function resetVariantFilters(motion: MotionApi, fs: FilterStateApi) {
  motion.prepareResultsViewportTransition('filters'); fs.setShowAllResults(false); fs.setSearch('')
  fs.setSelectedCampaign(ALL_CAMPAIGNS); fs.setSelectedAdventureId(''); fs.setSelectedSceneIds([])
  fs.setSelectedEnemyTypeIds([]); fs.setSelectedAttackProfile('__all__'); fs.setSelectedSpecialEnemyRange('__all__')
  fs.setAreaSearch(''); fs.setDetailTab('variants')
}
function buildVariantsActions(motion: MotionApi, groups: VariantCampaignGroup[], fs: FilterStateApi) {
  const runFilterMutation = (mutation: () => void) => {
    motion.prepareResultsViewportTransition('filters')
    fs.setShowAllResults(false)
    mutation()
  }
  const selectCampaign = (value: string) => { runFilterMutation(() => {
    const next = groups.find((g) => g.id === value); fs.setSelectedCampaign(value); fs.setSelectedAdventureId(next?.adventures[0]?.adventureId ?? '')
  }) }
  return {
    selectCampaign,
    selectAdventure: (value: string) => runFilterMutation(() => fs.setSelectedAdventureId(value)),
    selectAdventureTarget: (target: { campaignId: string; adventureId: string }) => {
      runFilterMutation(() => { fs.setSelectedCampaign(target.campaignId); fs.setSelectedAdventureId(target.adventureId) })
    },
    selectDetailTab: (value: VariantDetailTabId) => {
      motion.prepareResultsViewportTransition('filters')
      fs.setDetailTab(value)
    },
    updateSearch: (value: string) => runFilterMutation(() => fs.setSearch(value)),
    updateSelectedCampaign: selectCampaign,
    updateAreaSearch: (value: string) => runFilterMutation(() => fs.setAreaSearch(value)),
    updateAttackProfile: (value: AttackProfileFilterId) => runFilterMutation(() => fs.setSelectedAttackProfile(value)),
    updateSpecialEnemyRange: (value: SpecialEnemyFilterId) => runFilterMutation(() => fs.setSelectedSpecialEnemyRange(value)),
    resetEnemyTypes: () => runFilterMutation(() => fs.setSelectedEnemyTypeIds([])),
    toggleEnemyType: (value: string) => runFilterMutation(() => fs.setSelectedEnemyTypeIds((current) => toggleVariantSelection(current, value))),
    resetScenes: () => runFilterMutation(() => fs.setSelectedSceneIds([])),
    toggleScene: (value: string) => runFilterMutation(() => fs.setSelectedSceneIds((current) => toggleVariantSelection(current, value))),
    clearAllFilters: () => resetVariantFilters(motion, fs),
    toggleResultVisibility: () => {
      motion.prepareResultsViewportTransition('visibility')
      fs.setShowAllResults((current) => !current)
    },
  }
}
function buildVariantsReturnObject({ locale, t, state, filters, shareLinkState, filterState, derived, motion, copyCurrentLink }: {
  locale: AppLocale; t: ReturnType<typeof useI18n>['t']; state: VariantState; filters: VariantsFilterState; shareLinkState: ShareLinkApi['shareLinkState']
  filterState: FilterStateApi; derived: DerivedApi; motion: MotionApi; copyCurrentLink: ShareLinkApi['copyCurrentLink']
}): VariantsPageModel {
  const selectedCampaignLabel = state.status === 'ready' && derived.selectedCampaignGroup
    ? derived.selectedCampaignGroup.campaign : null
  const activeFilters = buildVariantNavigationFilters({
    locale, t, selectedCampaignLabel,
    search: filterState.search, selectedAdventureGroup: derived.selectedAdventureGroup,
    sceneOptions: derived.optionState.sceneOptions, selectedEnemyTypeIds: filterState.selectedEnemyTypeIds,
    selectedSceneIds: filterState.selectedSceneIds, selectedAttackProfile: filterState.selectedAttackProfile,
    selectedSpecialEnemyRange: filterState.selectedSpecialEnemyRange, areaSearch: filterState.areaSearch,
  })
  const actions = buildVariantsActions(motion, derived.allCampaignGroups, filterState)
  return {
    locale, t, state, filters, shareLinkState, activeFilters, selectedCampaignLabel, copyCurrentLink,
    canToggleResultVisibility: derived.filteredVariants.length > MAX_VISIBLE_VARIANTS,
    filteredVariants: derived.filteredVariants, visibleVariants: derived.visibleVariants,
    allCampaignGroups: derived.allCampaignGroups, visibleCampaignGroups: derived.visibleCampaignGroups,
    selectedCampaignGroup: derived.selectedCampaignGroup, selectedAdventureGroup: derived.selectedAdventureGroup,
    campaignsWithResults: derived.campaignsWithResults, adventuresWithResults: derived.adventuresWithResults,
    scenesWithResults: derived.scenesWithResults, showResultsQuickNavTop: motion.showResultsQuickNavTop,
    resultsPaneRef: motion.resultsPaneRef, enemyTypeOptions: derived.optionState.enemyTypeOptions,
    sceneOptions: derived.optionState.sceneOptions, commonObjectiveAreas: derived.optionState.commonObjectiveAreas,
    ...actions, scrollResultsToTop: motion.scrollResultsToTop,
  }
}
export function useVariantsPageModel(): VariantsPageModel {
  const location = useLocation()
  const [, setSearchParams] = useSearchParams()
  const { locale, t } = useI18n()
  const state = useVariantCollectionState()
  const initialFilters = useMemo(() => readInitialVariantsFilterState(location.search), [location.search])
  const normalizedLocationSearch = useMemo(() => new URLSearchParams(location.search).toString(), [location.search])
  const lastAppliedLocationSearchRef = useRef(normalizedLocationSearch)
  const pendingLocationSyncSearchRef = useRef<string | null>(null)
  const filterState = useVariantsFilterState(initialFilters)
  const { filters } = filterState
  const transitionKey = useMemo(() => buildVariantsFilterSearchParams(filters).toString(), [filters])
  useVariantsLocationSync({
    filters, normalizedLocationSearch, lastAppliedLocationSearchRef,
    pendingLocationSyncSearchRef, setSearchParams,
    locationSearch: location.search, applyNextFilters: filterState.applyNextFilters,
  })
  const derived = useVariantsDerivedData({
    locale, state, selectedCampaign: filterState.selectedCampaign,
    selectedAdventureId: filterState.selectedAdventureId, showAllResults: filterState.showAllResults,
  })
  const motion = useWorkbenchResultsMotion({
    storageKey: 'variants', locationSearch: location.search, stateStatus: state.status,
    filteredCount: derived.filteredVariants.length, visibleCount: derived.visibleVariants.length,
    showAllResults: filterState.showAllResults, transitionKey,
  })
  const { shareLinkState, copyCurrentLink } = useWorkbenchShareLink(
    location.pathname, location.search, location.hash,
  )
  return buildVariantsReturnObject({
    locale, t, state, filters, shareLinkState, filterState, derived, motion, copyCurrentLink,
  })
}
