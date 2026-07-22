import { useCallback, useEffect, useMemo, useState } from 'react'

import { loadCollection } from '../../data/client'
import { loadResolvedPlannerModel } from '../../data/plannerModel'
import { buildPlannerRecommendation } from '../../domain/planner/recommendationEngine'
import type { PlannerCollections } from '../../domain/planner/recommendationTypes'
import type { ScoringMode } from '../../domain/planner/steadyStateScoring'
import { resolveUserProfileSnapshot } from '../../data/user-profile-store'
import type { Variant } from '../../domain/types'
import type { UserProfileSnapshot } from '../../domain/user-profile/types'

type PlannerLoadState = 'loading' | 'ready' | 'error'

export function usePlannerPageModel() {
  const [collections, setCollections] = useState<PlannerCollections>({
    variants: [],
    plannerHeroes: [],
    plannerScenarios: [],
  })
  const [profileSnapshot, setProfileSnapshot] = useState<UserProfileSnapshot | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [scoringMode, setScoringMode] = useState<ScoringMode>('carry-dps')
  const [loadState, setLoadState] = useState<PlannerLoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadPlannerCollections() {
      setLoadState('loading')
      setLoadError(null)

      try {
        const [variants, plannerModel, resolution] = await Promise.all([
          loadCollection<Variant>('variants'),
          loadResolvedPlannerModel(),
          resolveUserProfileSnapshot(),
        ])

        if (!active) return

        setCollections({
          variants: variants.items,
          plannerHeroes: plannerModel.heroes,
          plannerScenarios: plannerModel.scenarios,
        })
        setProfileSnapshot(resolution.snapshot)
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

  const selectedVariant = useMemo(
    () => collections.variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [collections.variants, selectedVariantId],
  )
  const plannerRecommendation = useMemo(
    () => buildPlannerRecommendation(selectedVariant, collections, profileSnapshot, { scoringMode }),
    [collections, profileSnapshot, scoringMode, selectedVariant],
  )
  const selectVariantId = useCallback((variantId: string | null) => {
    setSelectedVariantId(variantId)
  }, [])
  const selectScoringMode = useCallback((mode: ScoringMode) => {
    setScoringMode(mode)
  }, [])

  return {
    collections,
    loadError,
    loadState,
    plannerRecommendation,
    scoringMode,
    selectedVariantId,
    selectVariantId,
    selectScoringMode,
  }
}
