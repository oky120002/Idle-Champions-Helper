import { useCallback, useEffect, useMemo, useState } from 'react'

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
    collections,
    profileSnapshot,
    lootCatalog,
    patronPerkCatalog,
    effectDefinitions,
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
  // 假设装备配置（未导入存档时的 UI what-if）：默认毕业 = 稀有度 4（传说）+ 附魔 2000。
  // 有存档时按存档 per-slot 实际，此配置仅无存档分支生效（buildScoringBonusInputs 内部判优先级）。
  const [equipmentRarity, setEquipmentRarity] = useState(4)
  const [equipmentEnchant, setEquipmentEnchant] = useState(2000)
  const [lockedCarryHeroId, setLockedCarryHeroId] = useState<string | null>(null)
  const [lockedSlots, setLockedSlots] = useState<Record<string, string>>({})
  const [selectedResultIndex, setSelectedResultIndex] = useState(0)
  // 专精选择 override（session 级 working copy，不写回 IndexedDB）：heroId → 选中的 upgradeId 列表。
  const [specializationOverrides, setSpecializationOverrides] = useState<SpecializationOverrideMap>({})

  // runner 单例：浏览器用 worker 卸载 beam search（UI 不冻）；jsdom（测试无 Worker）降级 Sync。
  const runner = useMemo(() => createPlannerComputeRunner(), [])
  useEffect(() => () => runner.dispose(), [runner])

  // 切换场景时锁槽/指定 carry 失效（slotId 随场景变）；模式/候选变化只 reset Top K 选中。
  // reset 放事件回调（非 effect），避免 setState-in-effect 级联渲染。
  const selectedVariant = useMemo(
    () => collections.variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [collections.variants, selectedVariantId],
  )
  // 外部加成装配（装备 + patron perk + blessing → scoring 三项入参）下沉纯函数 buildScoringBonusInputs；hook 只 memoize。
  // 未导入存档（profileSnapshot=null）→ 空 map / globalBuff 1 / hero_dps 空（scoreFormation 缺省，向后兼容）。
  const { equipmentAdjustmentByHero, equipmentHealthByHero, equipmentGlobalDpsByHero, equipmentGoldByHero, equipmentCritByHero, equipmentBuffsByHero, globalBuffMultiplier, externalHeroDpsContributions } = useMemo(
    () => buildScoringBonusInputs({
      profileSnapshot,
      lootCatalog,
      effectDefinitions,
      patronPerkCatalog,
      hypotheticalEquipment: {
        heroIds: collections.plannerHeroes.map((hero) => hero.heroId),
        rarity: equipmentRarity,
        enchant: equipmentEnchant,
      },
    }),
    [profileSnapshot, lootCatalog, effectDefinitions, patronPerkCatalog, collections.plannerHeroes, equipmentRarity, equipmentEnchant],
  )
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
      equipmentHealthByHero,
      equipmentGlobalDpsByHero,
      equipmentGoldByHero,
      equipmentCritByHero,
      equipmentBuffsByHero,
      globalBuffMultiplier,
      externalHeroDpsContributions,
    }),
    [scoringMode, candidateMode, computationMode, manualStackCount, lockedCarryHeroId, lockedSlots, equipmentAdjustmentByHero, equipmentHealthByHero, equipmentGlobalDpsByHero, equipmentGoldByHero, equipmentCritByHero, equipmentBuffsByHero, globalBuffMultiplier, externalHeroDpsContributions],
  )
  // 有效 snapshot = 存档 + 专精 override；engine 按 OwnedHero.specializations 注入 signal（ADR 0017）。
  // 无 override 时同引用返回，避免 usePlannerRecommendation 无谓重算。
  const effectiveProfileSnapshot = useMemo(
    () => mergeSpecializationOverrides(profileSnapshot, specializationOverrides),
    [profileSnapshot, specializationOverrides],
  )
  const { result, loading: recommendLoading, error: recommendError } = usePlannerRecommendation(
    runner,
    collections,
    selectedVariant,
    effectiveProfileSnapshot,
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
  const selectEquipmentRarity = useCallback((rarity: number) => {
    setEquipmentRarity(rarity)
    setSelectedResultIndex(0)
  }, [])
  const selectEquipmentEnchant = useCallback((enchant: number) => {
    setEquipmentEnchant(enchant)
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
  const setHeroSpecializationOverride = useCallback((heroId: string, upgradeIds: string[]) => {
    setSpecializationOverrides((current) => ({ ...current, [heroId]: upgradeIds }))
  }, [])
  const clearHeroSpecializationOverride = useCallback((heroId: string) => {
    setSpecializationOverrides((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, heroId)) return current
      const next = { ...current }
      delete next[heroId]
      return next
    })
  }, [])

  return {
    candidateMode,
    championById,
    collections,
    computationMode,
    equipmentEnchant,
    equipmentRarity,
    lockedCarryHeroId,
    lockedSlots,
    loadError,
    loadState,
    manualStackCount,
    plannerRecommendation: result ?? EMPTY_RECOMMENDATION,
    profileSnapshot,
    recommendLoading,
    recommendError,
    scoringMode,
    selectedResultIndex,
    selectedVariantId,
    specializationOverrides,
    clearHeroSpecializationOverride,
    clearSlotLock,
    selectCandidateMode,
    selectComputationMode,
    selectEquipmentEnchant,
    selectEquipmentRarity,
    selectManualStackCount,
    selectLockedCarryHeroId,
    selectResultIndex,
    selectVariantId,
    selectScoringMode,
    setHeroSpecializationOverride,
    lockSlot,
  }
}
