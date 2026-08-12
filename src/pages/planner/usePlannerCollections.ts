import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchJson, loadCollection, loadVersion } from '../../data/client'
import { loadResolvedPlannerModel } from '../../data/plannerModel'
import { resolveUserProfileSnapshot } from '../../data/user-profile-store'
import type { PlannerCollections } from '../../domain/planner/recommendationTypes'
import type { LootCatalogEntry } from '../../domain/buffs/equipmentMult'
import type { LegendaryEffectCatalogEntry } from '../../domain/buffs/legendaryEffects'
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
  legendaryEffectCatalog: LegendaryEffectCatalogEntry[]
  patronPerkCatalog: PatronPerkCatalogEntry[]
  /** DPS effect_def template（effect-definitions.json），供 globalBuff 解引用 + externalHeroDps 匹配。 */
  effectDefinitions: EffectDefinitionEntry[]
  championById: Map<string, Champion>
  selectedVariantId: string | null
  loadState: PlannerLoadState
  loadError: string | null
  selectVariantId: (variantId: string | null) => void
}

/** 加载并映射 planner 公共数据（场景/英雄/profile/champion 映射/loot-catalog），与 hook 分离减负。 */
interface PlannerCollectionsData {
  collections: PlannerCollections
  profileSnapshot: UserProfileSnapshot | null
  lootCatalog: LootCatalogEntry[]
  legendaryEffectCatalog: LegendaryEffectCatalogEntry[]
  patronPerkCatalog: PatronPerkCatalogEntry[]
  effectDefinitions: EffectDefinitionEntry[]
  championById: Map<string, Champion>
  firstVariantId: string | null
}

async function loadPlannerCollectionsData(): Promise<PlannerCollectionsData> {
  const version = await loadVersion()
  const [variants, plannerModel, resolution, champions, lootCatalogCollection, legendaryEffectCatalogCollection, patronPerksData, effectDefinitionsData, featCatalogData, specializationCatalogData] = await Promise.all([
    loadCollection<Variant>('variants'),
    loadResolvedPlannerModel(),
    resolveUserProfileSnapshot(),
    loadCollection<Champion>('champions'),
    loadCollection<LootCatalogEntry>('loot-catalog'),
    loadCollection<LegendaryEffectCatalogEntry>('legendary-effects-catalog'),
    fetchJson<{ perks: PatronPerkCatalogEntry[] }>(`${version.current}/patron-perks.json`),
    loadCollection<EffectDefinitionEntry>('effect-definitions'),
    fetchJson<{ catalog: FeatCatalog }>(`${version.current}/feat-catalog.json`),
    fetchJson<{ catalog: SpecializationCatalog }>(`${version.current}/specialization-catalog.json`),
  ])
  return {
    collections: {
      variants: variants.items,
      plannerHeroes: plannerModel.heroes,
      plannerScenarios: plannerModel.scenarios,
      featCatalog: featCatalogData.catalog,
      specializationCatalog: specializationCatalogData.catalog,
    },
    profileSnapshot: resolution.snapshot,
    lootCatalog: lootCatalogCollection.items,
    legendaryEffectCatalog: legendaryEffectCatalogCollection.items,
    patronPerkCatalog: patronPerksData.perks,
    effectDefinitions: effectDefinitionsData.items,
    championById: new Map(champions.items.map((champion) => [champion.id, champion])),
    firstVariantId: variants.items[0]?.id ?? null,
  }
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
 * 与回填 variantIdFromEvaluate）。不做推荐搜索与评估。
 */
export function usePlannerCollections(initialVariantId?: string | null): UsePlannerCollectionsResult {
  const [collections, setCollections] = useState<PlannerCollections>({ variants: [], plannerHeroes: [], plannerScenarios: [], featCatalog: {}, specializationCatalog: {} })
  const [profileSnapshot, setProfileSnapshot] = useState<UserProfileSnapshot | null>(null)
  const [lootCatalog, setLootCatalog] = useState<LootCatalogEntry[]>([])
  const [legendaryEffectCatalog, setLegendaryEffectCatalog] = useState<LegendaryEffectCatalogEntry[]>([])
  const [patronPerkCatalog, setPatronPerkCatalog] = useState<PatronPerkCatalogEntry[]>([])
  const [effectDefinitions, setEffectDefinitions] = useState<EffectDefinitionEntry[]>([])
  const [championById, setChampionById] = useState<Map<string, Champion>>(() => new Map())
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<PlannerLoadState>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  // ref 捕获初始值供 effect 内使用，避免进依赖数组触发重新加载（initialVariantId 仅首次加载生效）。
  const initialVariantIdRef = useRef(initialVariantId)

  useEffect(() => {
    let active = true
    async function run() {
      setLoadState('loading')
      setLoadError(null)
      try {
        const data = await loadPlannerCollectionsData()
        if (!active) return
        setCollections(data.collections)
        setProfileSnapshot(data.profileSnapshot)
        setLootCatalog(data.lootCatalog)
        setLegendaryEffectCatalog(data.legendaryEffectCatalog)
        setPatronPerkCatalog(data.patronPerkCatalog)
        setEffectDefinitions(data.effectDefinitions)
        setChampionById(data.championById)
        setSelectedVariantId((current) => current ?? initialVariantIdRef.current ?? data.firstVariantId)
        setLoadState('ready')
      } catch (caught: unknown) {
        if (!active) return
        setLoadState('error')
        setLoadError(caught instanceof Error ? caught.message : String(caught))
      }
    }
    void run()
    return () => {
      active = false
    }
  }, [])

  const selectVariantId = useCallback((variantId: string | null) => setSelectedVariantId(variantId), [])

  return {
    collections, profileSnapshot, lootCatalog, legendaryEffectCatalog, patronPerkCatalog,
    effectDefinitions, championById, selectedVariantId, loadState, loadError, selectVariantId,
  }
}
