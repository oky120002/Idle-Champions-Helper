import { useCallback, useMemo, useState } from 'react'

import { buildPlannerRecommendation } from '../../domain/planner/recommendationEngine'
import type { CandidateMode } from '../../domain/planner/candidatePool'
import type { ScoringMode } from '../../domain/planner/steadyStateScoring'
import { usePlannerCollections } from './usePlannerCollections'

export function usePlannerPageModel() {
  const {
    collections,
    profileSnapshot,
    championById,
    selectedVariantId,
    loadState,
    loadError,
    selectVariantId: selectVariantIdBase,
  } = usePlannerCollections()
  const [scoringMode, setScoringMode] = useState<ScoringMode>('carry-dps')
  const [candidateMode, setCandidateMode] = useState<CandidateMode>('owned-only')
  const [lockedCarryHeroId, setLockedCarryHeroId] = useState<string | null>(null)
  const [lockedSlots, setLockedSlots] = useState<Record<string, string>>({})
  const [selectedResultIndex, setSelectedResultIndex] = useState(0)

  // 切换场景时锁槽/指定 carry 失效（slotId 随场景变）；模式/候选变化只 reset Top K 选中。
  // reset 放事件回调（非 effect），避免 setState-in-effect 级联渲染。
  const selectedVariant = useMemo(
    () => collections.variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [collections.variants, selectedVariantId],
  )
  const plannerRecommendation = useMemo(
    () => buildPlannerRecommendation(selectedVariant, collections, profileSnapshot, {
      scoringMode,
      candidateMode,
      lockedCarryHeroId,
      lockedSlots,
    }),
    [collections, profileSnapshot, scoringMode, candidateMode, lockedCarryHeroId, lockedSlots, selectedVariant],
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
    lockedCarryHeroId,
    lockedSlots,
    loadError,
    loadState,
    plannerRecommendation,
    scoringMode,
    selectedResultIndex,
    selectedVariantId,
    clearSlotLock,
    selectCandidateMode,
    selectLockedCarryHeroId,
    selectResultIndex,
    selectVariantId,
    selectScoringMode,
    lockSlot,
  }
}
