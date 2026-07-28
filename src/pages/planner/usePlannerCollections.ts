import { useCallback, useEffect, useState } from 'react'

import { fetchJson, loadCollection, loadVersion } from '../../data/client'
import { loadResolvedPlannerModel } from '../../data/plannerModel'
import { resolveUserProfileSnapshot } from '../../data/user-profile-store'
import type { PlannerCollections } from '../../domain/planner/recommendationTypes'
import type { LootCatalogEntry } from '../../domain/simulator/equipmentMult'
import type { PatronPerkCatalogEntry } from '../../domain/simulator/patronPerkGlobalBuff'
import type { Champion, Variant } from '../../domain/types'
import type { UserProfileSnapshot } from '../../domain/user-profile/types'

type PlannerLoadState = 'loading' | 'ready' | 'error'

export interface UsePlannerCollectionsResult {
  collections: PlannerCollections
  profileSnapshot: UserProfileSnapshot | null
  lootCatalog: LootCatalogEntry[]
  patronPerkCatalog: PatronPerkCatalogEntry[]
  championById: Map<string, Champion>
  selectedVariantId: string | null
  loadState: PlannerLoadState
  loadError: string | null
  selectVariantId: (variantId: string | null) => void
}

/**
 * planner 公共数据加载（场景/英雄/profile/champion 映射/loot-catalog + 当前选中场景）。
 *
 * loot-catalog 是装备定义表（loot_defines 归一化），与 profileSnapshot.ownedHeroes[].lootBySlot
 * 一起在 usePlannerPageModel 算 equipmentAdjustmentByHero。不进 worker collections——主线程
 * 算成 per-hero map 后随 options 推进 worker（小载荷）。
 *
 * 注意：这是数据加载 hook，不是跨路由共享 store——每个页面实例各自维护选中场景与
 * 已加载数据。跨页携带选中场景由调用方经路由 state 传递（自配评估页 initialVariantId
 * 与回填 variantIdFromEvaluate）。不做推荐搜索与评分。
 */
export function usePlannerCollections(initialVariantId?: string | null): UsePlannerCollectionsResult {
  const [collections, setCollections] = useState<PlannerCollections>({
    variants: [],
    plannerHeroes: [],
    plannerScenarios: [],
  })
  const [profileSnapshot, setProfileSnapshot] = useState<UserProfileSnapshot | null>(null)
  const [lootCatalog, setLootCatalog] = useState<LootCatalogEntry[]>([])
  const [patronPerkCatalog, setPatronPerkCatalog] = useState<PatronPerkCatalogEntry[]>([])
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
        const version = await loadVersion()
        const [variants, plannerModel, resolution, champions, lootCatalogCollection, patronPerksData] = await Promise.all([
          loadCollection<Variant>('variants'),
          loadResolvedPlannerModel(),
          resolveUserProfileSnapshot(),
          loadCollection<Champion>('champions'),
          loadCollection<LootCatalogEntry>('loot-catalog'),
          fetchJson<{ perks: PatronPerkCatalogEntry[] }>(`${version.current}/patron-perks.json`),
        ])

        if (!active) return

        setCollections({
          variants: variants.items,
          plannerHeroes: plannerModel.heroes,
          plannerScenarios: plannerModel.scenarios,
        })
        setProfileSnapshot(resolution.snapshot)
        setLootCatalog(lootCatalogCollection.items)
        setPatronPerkCatalog(patronPerksData.perks ?? [])
        setChampionById(new Map(champions.items.map((champion) => [champion.id, champion])))
        setSelectedVariantId((current) => current ?? initialVariantId ?? variants.items[0]?.id ?? null)
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
    lootCatalog,
    patronPerkCatalog,
    championById,
    selectedVariantId,
    loadState,
    loadError,
    selectVariantId,
  }
}
