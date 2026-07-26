import { useCallback, useEffect, useState } from 'react'

import { loadCollection } from '../../data/client'
import { loadResolvedPlannerModel } from '../../data/plannerModel'
import { resolveUserProfileSnapshot } from '../../data/user-profile-store'
import type { PlannerCollections } from '../../domain/planner/recommendationTypes'
import type { Champion, Variant } from '../../domain/types'
import type { UserProfileSnapshot } from '../../domain/user-profile/types'

type PlannerLoadState = 'loading' | 'ready' | 'error'

export interface UsePlannerCollectionsResult {
  collections: PlannerCollections
  profileSnapshot: UserProfileSnapshot | null
  championById: Map<string, Champion>
  selectedVariantId: string | null
  loadState: PlannerLoadState
  loadError: string | null
  selectVariantId: (variantId: string | null) => void
}

/**
 * planner 公共数据加载（场景/英雄/profile/champion 映射 + 当前选中场景）。
 * 自动计划页与自配评估页共用，避免重复加载；不做推荐搜索与评分。
 */
export function usePlannerCollections(): UsePlannerCollectionsResult {
  const [collections, setCollections] = useState<PlannerCollections>({
    variants: [],
    plannerHeroes: [],
    plannerScenarios: [],
  })
  const [profileSnapshot, setProfileSnapshot] = useState<UserProfileSnapshot | null>(null)
  const [championById, setChampionById] = useState<Map<string, Champion>>(() => new Map())
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
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

  const selectVariantId = useCallback((variantId: string | null) => {
    setSelectedVariantId(variantId)
  }, [])

  return {
    collections,
    profileSnapshot,
    championById,
    selectedVariantId,
    loadState,
    loadError,
    selectVariantId,
  }
}
