import { useCallback, useEffect, useMemo, useState } from 'react'

import { createPlannerComputeRunner } from '../../domain/planner/compute/plannerCompute'
import type { CandidateMode } from '../../domain/planner/candidatePool'
import type { ComputationMode } from '../../domain/planner/computationMode'
import { DEFAULT_MANUAL_STACK_COUNT } from '../../domain/planner/placementFit'
import type { PlannerRecommendationOptions } from '../../domain/planner/recommendationEngine'
import type { PlannerRecommendation } from '../../domain/planner/recommendationTypes'
import type { ScoringMode } from '../../domain/planner/steadyStateScoring'
import { computeEquipmentAdjustmentByHero } from '../../domain/simulator/equipmentMult'
import { computeActualPatronPerkGlobalBuff } from '../../domain/simulator/patronPerkGlobalBuff'
import { combineGlobalBuffMultipliers, computeActualBlessingGlobalBuff } from '../../domain/simulator/blessingGlobalBuff'
import { usePlannerCollections } from './usePlannerCollections'
import { usePlannerRecommendation } from './usePlannerCompute'

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
    collections,
    profileSnapshot,
    lootCatalog,
    patronPerkCatalog,
    championById,
    selectedVariantId,
    loadState,
    loadError,
    selectVariantId: selectVariantIdBase,
  } = usePlannerCollections()
  const [scoringMode, setScoringMode] = useState<ScoringMode>('carry-dps')
  const [candidateMode, setCandidateMode] = useState<CandidateMode>('owned-only')
  const [computationMode, setComputationMode] = useState<ComputationMode>('p50')
  // 动态层数假设（dynamic-stack-multiply，如蔚出言不逊）；默认与引擎 DEFAULT_MANUAL_STACK_COUNT 同源。
  const [manualStackCount, setManualStackCount] = useState(DEFAULT_MANUAL_STACK_COUNT)
  const [lockedCarryHeroId, setLockedCarryHeroId] = useState<string | null>(null)
  const [lockedSlots, setLockedSlots] = useState<Record<string, string>>({})
  const [selectedResultIndex, setSelectedResultIndex] = useState(0)

  // runner 单例：浏览器用 worker 卸载 beam search（UI 不冻）；jsdom（测试无 Worker）降级 Sync。
  const runner = useMemo(() => createPlannerComputeRunner(), [])
  useEffect(() => () => runner.dispose(), [runner])

  // 切换场景时锁槽/指定 carry 失效（slotId 随场景变）；模式/候选变化只 reset Top K 选中。
  // reset 放事件回调（非 effect），避免 setState-in-effect 级联渲染。
  const selectedVariant = useMemo(
    () => collections.variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [collections.variants, selectedVariantId],
  )
  // 装备加成（per-hero map）：profileSnapshot.lootBySlot + loot-catalog → equipmentAdjustmentByHero。
  // 未导入存档（profileSnapshot=null）→ 空 map → scoreFormation 缺省 ?? 1 → 无加成（向后兼容）。
  const equipmentAdjustmentByHero = useMemo(
    () => profileSnapshot && lootCatalog.length > 0
      ? computeEquipmentAdjustmentByHero(profileSnapshot.ownedHeroes, lootCatalog)
      : new Map<string, number>(),
    [profileSnapshot, lootCatalog],
  )
  // patron perk + blessing actual 全局 buff（global_dps add pool 合并：1 + Σ(value)/100）。
  // 未导入存档 → 各源 1（无加成，向后兼容）；combineGlobalBuffMultipliers 合并同 pool。
  const globalBuffMultiplier = useMemo(() => {
    const active = profileSnapshot?.activeContext
    const patronMult = profileSnapshot?.patronPerks
      ? computeActualPatronPerkGlobalBuff(profileSnapshot.patronPerks, patronPerkCatalog, active?.patronId)
      : 1
    const blessingMult = profileSnapshot?.blessings
      ? computeActualBlessingGlobalBuff(profileSnapshot.blessings.levels, profileSnapshot.blessings.catalog, active?.deity)
      : 1
    return combineGlobalBuffMultipliers([patronMult, blessingMult])
  }, [profileSnapshot, patronPerkCatalog])
  // options 必须 memoize：usePlannerRecommendation 把 options 作为依赖，引用不稳会每次触发重算。
  const options = useMemo<PlannerRecommendationOptions>(
    () => ({
      scoringMode,
      candidateMode,
      computationMode,
      manualStackCount,
      lockedCarryHeroId,
      lockedSlots,
      equipmentAdjustmentByHero,
      globalBuffMultiplier,
    }),
    [scoringMode, candidateMode, computationMode, manualStackCount, lockedCarryHeroId, lockedSlots, equipmentAdjustmentByHero, globalBuffMultiplier],
  )
  const { result, loading: recommendLoading, error: recommendError } = usePlannerRecommendation(
    runner,
    collections,
    selectedVariant,
    profileSnapshot,
    options,
  )
  const selectVariantId = useCallback((variantId: string | null) => {
    selectVariantIdBase(variantId)
    setSelectedResultIndex(0)
    setLockedSlots({})
    setLockedCarryHeroId(null)
  }, [selectVariantIdBase])
  const selectScoringMode = useCallback((mode: ScoringMode) => {
    setScoringMode(mode)
    setSelectedResultIndex(0)
  }, [])
  const selectCandidateMode = useCallback((mode: CandidateMode) => {
    setCandidateMode(mode)
    setSelectedResultIndex(0)
  }, [])
  const selectComputationMode = useCallback((mode: ComputationMode) => {
    setComputationMode(mode)
    setSelectedResultIndex(0)
  }, [])
  const selectManualStackCount = useCallback((count: number) => {
    setManualStackCount(count)
    setSelectedResultIndex(0)
  }, [])
  const selectLockedCarryHeroId = useCallback((heroId: string | null) => {
    setLockedCarryHeroId(heroId)
  }, [])
  const lockSlot = useCallback((slotId: string, heroId: string) => {
    setLockedSlots((current) => ({ ...current, [slotId]: heroId }))
  }, [])
  const clearSlotLock = useCallback((slotId: string) => {
    setLockedSlots((current) => {
      const next = { ...current }
      delete next[slotId]
      return next
    })
  }, [])
  const selectResultIndex = useCallback((index: number) => {
    setSelectedResultIndex(index)
  }, [])

  return {
    candidateMode,
    championById,
    collections,
    computationMode,
    lockedCarryHeroId,
    lockedSlots,
    loadError,
    loadState,
    manualStackCount,
    plannerRecommendation: result ?? EMPTY_RECOMMENDATION,
    recommendLoading,
    recommendError,
    scoringMode,
    selectedResultIndex,
    selectedVariantId,
    clearSlotLock,
    selectCandidateMode,
    selectComputationMode,
    selectManualStackCount,
    selectLockedCarryHeroId,
    selectResultIndex,
    selectVariantId,
    selectScoringMode,
    lockSlot,
  }
}
