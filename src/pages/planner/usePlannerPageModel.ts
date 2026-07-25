import { useCallback, useEffect, useMemo, useState } from 'react'

import { loadCollection } from '../../data/client'
import { loadResolvedPlannerModel } from '../../data/plannerModel'
import { buildPlannerRecommendation } from '../../domain/planner/recommendationEngine'
import type { PlannerCollections } from '../../domain/planner/recommendationTypes'
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
  // 阶段 15.1：棋盘头像字典。planner hero 能力模型不带 portrait，单独加载 Champion 集合。
  const [championById, setChampionById] = useState<Map<string, Champion>>(() => new Map())
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [scoringMode, setScoringMode] = useState<ScoringMode>('carry-dps')
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

  // 阶段 15.2：切换场景时 Top K 重新计算，选中索引回到 top1。
  useEffect(() => {
    setSelectedResultIndex(0)
  }, [selectedVariantId])

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
  const selectResultIndex = useCallback((index: number) => {
    setSelectedResultIndex(index)
  }, [])

  return {
    championById,
    collections,
    loadError,
    loadState,
    plannerRecommendation,
    scoringMode,
    selectedResultIndex,
    selectedVariantId,
    selectResultIndex,
    selectVariantId,
    selectScoringMode,
  }
}
