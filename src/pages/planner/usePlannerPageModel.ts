import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'

import { createPlannerComputeRunner } from '../../domain/planner/compute/plannerCompute'
import type { CandidateMode } from '../../domain/planner/candidatePool'
import type { ComputationMode } from '../../domain/planner/computationMode'
import { DEFAULT_MANUAL_STACK_COUNT } from '../../domain/planner/placementFit'
import type { PlannerRecommendationOptions } from '../../domain/planner/recommendationEngine'
import type { PlannerRecommendation } from '../../domain/planner/recommendationTypes'
import type { ScoringMode } from '../../domain/planner/steadyStateScoring'
import { buildScoringBonusInputs } from '../../domain/planner/scoringBonusInputs'
import { usePlannerCollections } from './usePlannerCollections'
import { usePlannerRecommendation } from './usePlannerCompute'
import { mergeSpecializationOverrides, type SpecializationOverrideMap } from './specializationSelection'

// 首次计算 / 错误态占位：hook result 为 null 时用，保证 UI 消费方拿到稳定结构。
const EMPTY_RECOMMENDATION: PlannerRecommendation = {
  result: null,
  results: [],
  layoutId: null,
  slots: [],
  scenarioRef: null,
  blocker: null,
}

export function usePlannerPageModel() {
  const {
    collections, profileSnapshot, lootCatalog, patronPerkCatalog, effectDefinitions,
    championById, selectedVariantId, loadState, loadError, selectVariantId: selectVariantIdBase,
  } = usePlannerCollections()
  const [scoringMode, setScoringMode] = useState<ScoringMode>('carry-dps')
  const [candidateMode, setCandidateMode] = useState<CandidateMode>('owned-only')
  const [computationMode, setComputationMode] = useState<ComputationMode>('p50')
  const [manualStackCount, setManualStackCount] = useState(DEFAULT_MANUAL_STACK_COUNT)
  const [equipmentRarity, setEquipmentRarity] = useState(4)
  const [equipmentEnchant, setEquipmentEnchant] = useState(2000)
  const [lockedCarryHeroId, setLockedCarryHeroId] = useState<string | null>(null)
  const [lockedSlots, setLockedSlots] = useState<Record<string, string>>({})
  const [selectedResultIndex, setSelectedResultIndex] = useState(0)
  const [specializationOverrides, setSpecializationOverrides] = useState<SpecializationOverrideMap>({})

  const { result, recommendLoading, recommendError } = usePlannerRecommendationFlow({
    collections, profileSnapshot, lootCatalog, patronPerkCatalog, effectDefinitions,
    selectedVariantId, scoringMode, candidateMode, computationMode, manualStackCount,
    equipmentRarity, equipmentEnchant, lockedCarryHeroId, lockedSlots, specializationOverrides,
  })
  const selectors = usePlannerPageSelectors({
    selectVariantIdBase, setSelectedResultIndex, setLockedSlots, setLockedCarryHeroId,
    setScoringMode, setCandidateMode, setComputationMode, setManualStackCount,
    setEquipmentRarity, setEquipmentEnchant, setSpecializationOverrides,
  })

  return {
    candidateMode, championById, collections, computationMode, equipmentEnchant, equipmentRarity,
    lockedCarryHeroId, lockedSlots, loadError, loadState, manualStackCount,
    profileSnapshot, recommendLoading, recommendError, scoringMode, selectedResultIndex,
    selectedVariantId, specializationOverrides,
    plannerRecommendation: result ?? EMPTY_RECOMMENDATION,
    ...selectors,
  }
}

function usePlannerRecommendationFlow(params: {
  collections: ReturnType<typeof usePlannerCollections>['collections']
  profileSnapshot: ReturnType<typeof usePlannerCollections>['profileSnapshot']
  lootCatalog: ReturnType<typeof usePlannerCollections>['lootCatalog']
  patronPerkCatalog: ReturnType<typeof usePlannerCollections>['patronPerkCatalog']
  effectDefinitions: ReturnType<typeof usePlannerCollections>['effectDefinitions']
  selectedVariantId: string | null
  scoringMode: ScoringMode
  candidateMode: CandidateMode
  computationMode: ComputationMode
  manualStackCount: number
  equipmentRarity: number
  equipmentEnchant: number
  lockedCarryHeroId: string | null
  lockedSlots: Record<string, string>
  specializationOverrides: SpecializationOverrideMap
}) {
  const runner = useMemo(() => createPlannerComputeRunner(), [])
  useEffect(() => () => { runner.dispose(); }, [runner])
  const selectedVariant = useMemo(
    () => params.collections.variants.find((v) => v.id === params.selectedVariantId) ?? null,
    [params.collections.variants, params.selectedVariantId],
  )
  const scoringInputs = useMemo(
    () => buildScoringBonusInputs({
      profileSnapshot: params.profileSnapshot, lootCatalog: params.lootCatalog,
      effectDefinitions: params.effectDefinitions, patronPerkCatalog: params.patronPerkCatalog,
      hypotheticalEquipment: { heroIds: params.collections.plannerHeroes.map((h) => h.heroId), rarity: params.equipmentRarity, enchant: params.equipmentEnchant },
      featCatalog: params.collections.featCatalog ?? null,
    }),
    [params.profileSnapshot, params.lootCatalog, params.effectDefinitions, params.patronPerkCatalog, params.collections.plannerHeroes, params.collections.featCatalog, params.equipmentRarity, params.equipmentEnchant],
  )
  const options = useMemo<PlannerRecommendationOptions>(
    () => ({ scoringMode: params.scoringMode, candidateMode: params.candidateMode, computationMode: params.computationMode, manualStackCount: params.manualStackCount, lockedCarryHeroId: params.lockedCarryHeroId, lockedSlots: params.lockedSlots, ...scoringInputs }),
    [params.scoringMode, params.candidateMode, params.computationMode, params.manualStackCount, params.lockedCarryHeroId, params.lockedSlots, scoringInputs],
  )
  const effectiveProfileSnapshot = useMemo(
    () => mergeSpecializationOverrides(params.profileSnapshot, params.specializationOverrides),
    [params.profileSnapshot, params.specializationOverrides],
  )
  const { result, loading: recommendLoading, error: recommendError } = usePlannerRecommendation(
    runner, params.collections, selectedVariant, effectiveProfileSnapshot, options,
  )
  return { result, recommendLoading, recommendError }
}

function usePlannerPageSelectors(params: {
  selectVariantIdBase: (variantId: string | null) => void
  setSelectedResultIndex: Dispatch<SetStateAction<number>>
  setLockedSlots: Dispatch<SetStateAction<Record<string, string>>>
  setLockedCarryHeroId: Dispatch<SetStateAction<string | null>>
  setScoringMode: Dispatch<SetStateAction<ScoringMode>>
  setCandidateMode: Dispatch<SetStateAction<CandidateMode>>
  setComputationMode: Dispatch<SetStateAction<ComputationMode>>
  setManualStackCount: Dispatch<SetStateAction<number>>
  setEquipmentRarity: Dispatch<SetStateAction<number>>
  setEquipmentEnchant: Dispatch<SetStateAction<number>>
  setSpecializationOverrides: Dispatch<SetStateAction<SpecializationOverrideMap>>
}) {
  const modeSelectors = usePlannerModeSelectors(params)
  const slotSelectors = usePlannerSlotSelectors(params)
  return { ...modeSelectors, ...slotSelectors }
}

function usePlannerModeSelectors({
  selectVariantIdBase, setSelectedResultIndex, setLockedSlots, setLockedCarryHeroId,
  setScoringMode, setCandidateMode, setComputationMode, setManualStackCount,
  setEquipmentRarity, setEquipmentEnchant,
}: {
  selectVariantIdBase: (variantId: string | null) => void
  setSelectedResultIndex: Dispatch<SetStateAction<number>>
  setLockedSlots: Dispatch<SetStateAction<Record<string, string>>>
  setLockedCarryHeroId: Dispatch<SetStateAction<string | null>>
  setScoringMode: Dispatch<SetStateAction<ScoringMode>>
  setCandidateMode: Dispatch<SetStateAction<CandidateMode>>
  setComputationMode: Dispatch<SetStateAction<ComputationMode>>
  setManualStackCount: Dispatch<SetStateAction<number>>
  setEquipmentRarity: Dispatch<SetStateAction<number>>
  setEquipmentEnchant: Dispatch<SetStateAction<number>>
}) {
  const selectVariantId = useCallback((variantId: string | null) => {
    selectVariantIdBase(variantId); setSelectedResultIndex(0); setLockedSlots({}); setLockedCarryHeroId(null)
  }, [selectVariantIdBase, setSelectedResultIndex, setLockedSlots, setLockedCarryHeroId])
  const selectScoringMode = useCallback((mode: ScoringMode) => { setScoringMode(mode); setSelectedResultIndex(0) }, [setScoringMode, setSelectedResultIndex])
  const selectCandidateMode = useCallback((mode: CandidateMode) => { setCandidateMode(mode); setSelectedResultIndex(0) }, [setCandidateMode, setSelectedResultIndex])
  const selectComputationMode = useCallback((mode: ComputationMode) => { setComputationMode(mode); setSelectedResultIndex(0) }, [setComputationMode, setSelectedResultIndex])
  const selectManualStackCount = useCallback((count: number) => { setManualStackCount(count); setSelectedResultIndex(0) }, [setManualStackCount, setSelectedResultIndex])
  const selectEquipmentRarity = useCallback((rarity: number) => { setEquipmentRarity(rarity); setSelectedResultIndex(0) }, [setEquipmentRarity, setSelectedResultIndex])
  const selectEquipmentEnchant = useCallback((enchant: number) => { setEquipmentEnchant(enchant); setSelectedResultIndex(0) }, [setEquipmentEnchant, setSelectedResultIndex])
  return { selectVariantId, selectScoringMode, selectCandidateMode, selectComputationMode, selectManualStackCount, selectEquipmentRarity, selectEquipmentEnchant }
}

function usePlannerSlotSelectors({
  setSelectedResultIndex, setLockedSlots, setLockedCarryHeroId, setSpecializationOverrides,
}: {
  setSelectedResultIndex: Dispatch<SetStateAction<number>>
  setLockedSlots: Dispatch<SetStateAction<Record<string, string>>>
  setLockedCarryHeroId: Dispatch<SetStateAction<string | null>>
  setSpecializationOverrides: Dispatch<SetStateAction<SpecializationOverrideMap>>
}) {
  const selectLockedCarryHeroId = useCallback((heroId: string | null) => { setLockedCarryHeroId(heroId) }, [setLockedCarryHeroId])
  const lockSlot = useCallback((slotId: string, heroId: string) => {
    setLockedSlots((current) => ({ ...current, [slotId]: heroId }))
  }, [setLockedSlots])
  const clearSlotLock = useCallback((slotId: string) => {
    setLockedSlots((current) => { const next = { ...current }; delete next[slotId]; return next })
  }, [setLockedSlots])
  const selectResultIndex = useCallback((index: number) => { setSelectedResultIndex(index) }, [setSelectedResultIndex])
  const setHeroSpecializationOverride = useCallback((heroId: string, upgradeIds: string[]) => {
    setSpecializationOverrides((current) => ({ ...current, [heroId]: upgradeIds }))
  }, [setSpecializationOverrides])
  const clearHeroSpecializationOverride = useCallback((heroId: string) => {
    setSpecializationOverrides((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, heroId)) return current
      const next = { ...current }; delete next[heroId]; return next
    })
  }, [setSpecializationOverrides])
  return { clearHeroSpecializationOverride, clearSlotLock, selectLockedCarryHeroId, selectResultIndex, setHeroSpecializationOverride, lockSlot }
}
