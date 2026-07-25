import { useCallback, useEffect, useMemo, useState } from 'react'

import { loadCollection } from '../../data/client'
import { loadResolvedPlannerModel } from '../../data/plannerModel'
import { buildPlannerRecommendation } from '../../domain/planner/recommendationEngine'
import type { PlannerCollections } from '../../domain/planner/recommendationTypes'
import type { CandidateMode } from '../../domain/planner/candidatePool'
import type { ScoringMode } from '../../domain/planner/steadyStateScoring'
import { resolveUserProfileSnapshot } from '../../data/user-profile-store'
import type { Champion, Variant } from '../../domain/types'
import type { UserProfileSnapshot } from '../../domain/user-profile/types'

type PlannerLoadState = 'loading' | 'ready' | 'error'

export function usePlannerPageModel() {
  const [collections, setCollections] = useState<PlannerCollections>({
    variants: [],
    plannerHeroes: [],
    plannerScenarios: [],
  })
  const [profileSnapshot, setProfileSnapshot] = useState<UserProfileSnapshot | null>(null)
  const [championById, setChampionById] = useState<Map<string, Champion>>(() => new Map())
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [scoringMode, setScoringMode] = useState<ScoringMode>('carry-dps')
  const [candidateMode, setCandidateMode] = useState<CandidateMode>('owned-only')
  const [lockedCarryHeroId, setLockedCarryHeroId] = useState<string | null>(null)
  const [lockedSlots, setLockedSlots] = useState<Record<string, string>>({})
  const [selectedResultIndex, setSelectedResultIndex] = useState(0)
  const [loadState, setLoadState] = useState<PlannerLoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadPlannerCollections() {
      setLoadState('loading')
      setLoadError(null)

      try {
        const [variants, plannerModel, resolution, champions] = await Promise.all([
          loadCollection<Variant>('variants'),
          loadResolvedPlannerModel(),
          resolveUserProfileSnapshot(),
          loadCollection<Champion>('champions'),
        ])

        if (!active) return

        setCollections({
          variants: variants.items,
          plannerHeroes: plannerModel.heroes,
          plannerScenarios: plannerModel.scenarios,
        })
        setProfileSnapshot(resolution.snapshot)
        setChampionById(new Map(champions.items.map((champion) => [champion.id, champion])))
        setSelectedVariantId((current) => current ?? variants.items[0]?.id ?? null)
        setLoadState('ready')
      } catch (caught) {
        if (!active) return
        setLoadState('error')
        setLoadError(caught instanceof Error ? caught.message : String(caught))
      }
    }

    void loadPlannerCollections()

    return () => {
      active = false
    }
  }, [])

  // 切换场景时锁槽/指定 carry 失效（slotId 随场景变）；模式/候选变化只 reset Top K 选中。
  useEffect(() => {
    setSelectedResultIndex(0)
    setLockedSlots({})
    setLockedCarryHeroId(null)
  }, [selectedVariantId])

  useEffect(() => {
    setSelectedResultIndex(0)
  }, [scoringMode, candidateMode])

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
    setSelectedVariantId(variantId)
  }, [])
  const selectScoringMode = useCallback((mode: ScoringMode) => {
    setScoringMode(mode)
  }, [])
  const selectCandidateMode = useCallback((mode: CandidateMode) => {
    setCandidateMode(mode)
  }, [])
  const selectLockedCarryHeroId = useCallback((heroId: string | null) => {
    setLockedCarryHeroId(heroId)
  }, [])
  const toggleSlotLock = useCallback((slotId: string, heroId: string) => {
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
    toggleSlotLock,
  }
}
