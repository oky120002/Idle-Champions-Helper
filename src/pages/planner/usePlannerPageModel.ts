import { useCallback, useEffect, useMemo, useState } from 'react'

import { loadCollection } from '../../data/client'
import { resolveUserProfileSnapshot } from '../../data/user-profile-store'
import type { Champion, FormationLayout, Variant } from '../../domain/types'
import type { UserProfileSnapshot } from '../../domain/user-profile/types'
import {
  buildPlannerRecommendation,
  type PlannerCollections,
} from './plannerRecommendation'

type PlannerLoadState = 'loading' | 'ready' | 'error'

export function usePlannerPageModel() {
  const [collections, setCollections] = useState<PlannerCollections>({
    variants: [],
    champions: [],
    formations: [],
  })
  const [profileSnapshot, setProfileSnapshot] = useState<UserProfileSnapshot | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<PlannerLoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadPlannerCollections() {
      setLoadState('loading')
      setLoadError(null)

      try {
        const [variants, champions, formations, resolution] = await Promise.all([
          loadCollection<Variant>('variants'),
          loadCollection<Champion>('champions'),
          loadCollection<FormationLayout>('formations'),
          resolveUserProfileSnapshot(),
        ])

        if (!active) return

        setCollections({
          variants: variants.items,
          champions: champions.items,
          formations: formations.items,
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
    () => buildPlannerRecommendation(selectedVariant, collections, profileSnapshot),
    [collections, profileSnapshot, selectedVariant],
  )
  const selectVariantId = useCallback((variantId: string | null) => {
    setSelectedVariantId(variantId)
  }, [])

  return {
    collections,
    loadError,
    loadState,
    plannerRecommendation,
    selectedVariantId,
    selectVariantId,
  }
}
