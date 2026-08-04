import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'

import { fetchJson, loadCollection, loadVersion } from '../../data/client'
import { loadResolvedPlannerModel } from '../../data/plannerModel'
import { resolveUserProfileSnapshot } from '../../data/user-profile-store'
import type { PlannerCollections } from '../../domain/planner/recommendationTypes'
import type { LootCatalogEntry } from '../../domain/buffs/equipmentMult'
import type { PatronPerkCatalogEntry } from '../../domain/buffs/patronPerkGlobalBuff'
import type { EffectDefinitionEntry } from '../../domain/buffs/effectDefinitionDps'
import type { FeatCatalog } from '../../domain/abilities/featSignals'
import type { SpecializationCatalog } from '../../domain/abilities/specializationSignals'
import type { Champion, Variant } from '../../domain/types'
import type { UserProfileSnapshot } from '../../domain/user-profile/types'

type PlannerLoadState = 'loading' | 'ready' | 'error'

export interface UsePlannerCollectionsResult {
  collections: PlannerCollections
  profileSnapshot: UserProfileSnapshot | null
  lootCatalog: LootCatalogEntry[]
  patronPerkCatalog: PatronPerkCatalogEntry[]
  /** DPS effect_def template（effect-definitions.json），供 globalBuff 解引用 + externalHeroDps 匹配。 */
  effectDefinitions: EffectDefinitionEntry[]
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
async function fetchAllPlannerData() {
  const version = await loadVersion()
  const [variants, plannerModel, resolution, champions, lootCatalogCollection, patronPerksData, effectDefinitionsData, featCatalogData, specializationCatalogData] = await Promise.all([
    loadCollection<Variant>('variants'),
    loadResolvedPlannerModel(),
    resolveUserProfileSnapshot(),
    loadCollection<Champion>('champions'),
    loadCollection<LootCatalogEntry>('loot-catalog'),
    fetchJson<{ perks: PatronPerkCatalogEntry[] }>(`${version.current}/patron-perks.json`),
    loadCollection<EffectDefinitionEntry>('effect-definitions'),
    fetchJson<{ catalog: FeatCatalog }>(`${version.current}/feat-catalog.json`),
    fetchJson<{ catalog: SpecializationCatalog }>(`${version.current}/specialization-catalog.json`),
  ])
  return { variants, plannerModel, resolution, champions, lootCatalogCollection, patronPerksData, effectDefinitionsData, featCatalogData, specializationCatalogData }
}

type PlannerData = Awaited<ReturnType<typeof fetchAllPlannerData>>

function applyPlannerData(
  data: PlannerData,
  initialVariantId: string | null | undefined,
  setCollections: Dispatch<SetStateAction<PlannerCollections>>,
  setProfileSnapshot: Dispatch<SetStateAction<UserProfileSnapshot | null>>,
  setLootCatalog: Dispatch<SetStateAction<LootCatalogEntry[]>>,
  setPatronPerkCatalog: Dispatch<SetStateAction<PatronPerkCatalogEntry[]>>,
  setEffectDefinitions: Dispatch<SetStateAction<EffectDefinitionEntry[]>>,
  setChampionById: Dispatch<SetStateAction<Map<string, Champion>>>,
  setSelectedVariantId: Dispatch<SetStateAction<string | null>>,
) {
  setCollections({
    variants: data.variants.items,
    plannerHeroes: data.plannerModel.heroes,
    plannerScenarios: data.plannerModel.scenarios,
    featCatalog: data.featCatalogData.catalog,
    specializationCatalog: data.specializationCatalogData.catalog,
  })
  setProfileSnapshot(data.resolution.snapshot)
  setLootCatalog(data.lootCatalogCollection.items)
  setPatronPerkCatalog(data.patronPerksData.perks)
  setEffectDefinitions(data.effectDefinitionsData.items)
  setChampionById(new Map(data.champions.items.map((c) => [c.id, c])))
  setSelectedVariantId((current) => current ?? initialVariantId ?? data.variants.items[0]?.id ?? null)
}

export function usePlannerCollections(initialVariantId?: string | null): UsePlannerCollectionsResult {
  const [collections, setCollections] = useState<PlannerCollections>({
    variants: [],
    plannerHeroes: [],
    plannerScenarios: [],
    featCatalog: {},
    specializationCatalog: {},
  })
  const [profileSnapshot, setProfileSnapshot] = useState<UserProfileSnapshot | null>(null)
  const [lootCatalog, setLootCatalog] = useState<LootCatalogEntry[]>([])
  const [patronPerkCatalog, setPatronPerkCatalog] = useState<PatronPerkCatalogEntry[]>([])
  const [effectDefinitions, setEffectDefinitions] = useState<EffectDefinitionEntry[]>([])
  const [championById, setChampionById] = useState<Map<string, Champion>>(() => new Map())
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<PlannerLoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void fetchAllPlannerData().then((data) => {
      if (!active) return
      applyPlannerData(data, initialVariantId, setCollections, setProfileSnapshot, setLootCatalog, setPatronPerkCatalog, setEffectDefinitions, setChampionById, setSelectedVariantId)
      setLoadState('ready')
    }).catch((caught: unknown) => {
      if (!active) return
      setLoadState('error')
      setLoadError(caught instanceof Error ? caught.message : String(caught))
    })

    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectVariantId = useCallback((variantId: string | null) => {
    setSelectedVariantId(variantId)
  }, [])

  return {
    collections,
    profileSnapshot,
    lootCatalog,
    patronPerkCatalog,
    effectDefinitions,
    championById,
    selectedVariantId,
    loadState,
    loadError,
    selectVariantId,
  }
}
