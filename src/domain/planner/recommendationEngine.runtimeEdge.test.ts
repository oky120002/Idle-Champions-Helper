import { describe, expect, it } from 'vitest'

import type { LocalizedOption, LocalizedText, Variant } from '../types'
import { buildPlannerRecommendation, evaluateFormation } from './recommendationEngine'
import type { HeroAbilityProfile } from '../abilities/abilityModel'
import type { OfficialPlannerScenarioModel } from './plannerModel'
import type { PlannerCollections } from './recommendationTypes'
import { createOwnedHero, createUserProfileSnapshot } from '../user-profile/fixtures'
import { resolveHeroAbilityProfiles } from '../abilities/abilityModel'

/**
 * 轮 7 运行时边界审计的实测复现：喂损坏/极端/不一致数据，锁定失败路径的实际行为。
 * 区别于 recommendationEngine.test.ts（happy-path 正确性），本文件聚焦降级与边界。
 */

function text(original: string, display = original): LocalizedText {
  return { original, display }
}

function option(id: string, original: string, display = original): LocalizedOption {
  return { id, original, display }
}

const campaign = option('campaign-a', 'Grand Tour', '剑湾之旅')

function buildVariant(id: string): Variant {
  return {
    id,
    campaign,
    name: text(id, id),
    adventureId: null,
    adventure: null,
    objectiveArea: 100,
    locationId: null,
    areaSetId: null,
    scene: null,
    restrictions: [],
    rewards: [],
    enemyCount: 0,
    enemyTypes: [],
    attackMix: { melee: 0, ranged: 0, magic: 0, other: 0 },
    specialEnemyCount: 0,
    escortCount: 0,
    areaHighlights: [],
    areaMilestones: [],
    mechanics: [],
    forcedHeroIds: [],
    allowedHeroIds: [],
    allowedTags: [],
  }
}

const heroIds = ['h1', 'h2', 'h3', 'h4']
const plannerHeroes: HeroAbilityProfile[] = heroIds.map((id, index) => ({
  heroId: id,
  name: text(id, id),
  seat: index + 1,
  roles: ['dps'],
  tags: [],
  baseAttackDamageTypes: [],
  baseAttackCooldown: null,
  age: null,
  abilityScores: {},
  baseDamage: 1,
  baseHealth: 1,
  carrySignals: [],
  supportSignals: [],
  unsupportedSignals: [],
  sourceBreakdown: { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
}))

function buildScenario(
  variantId: string,
  overrides: Partial<OfficialPlannerScenarioModel> = {},
): OfficialPlannerScenarioModel {
  return {
    variantId,
    scenarioRef: { kind: 'variant', id: variantId },
    name: text(variantId, variantId),
    formationLayoutId: 'layout-a',
    objectiveArea: 100,
    slotTopology: [
      { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
      { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1'] },
    ],
    forcedHeroes: [],
    bannedHeroes: [],
    lockedSlots: [],
    scenarioWarnings: [],
    enemyTypes: [],
    allowedHeroes: [],
    allowedTags: [],
    occupiedSlotCount: 0,
    ...overrides,
  }
}

function buildCollections(scenarios: OfficialPlannerScenarioModel[]): PlannerCollections {
  return {
    variants: scenarios.map((s) => buildVariant(s.variantId)),
    plannerHeroes,
    plannerScenarios: scenarios,
  }
}

describe('runtime edge — forced∩banned 冲突', () => {
  it('同一英雄同时被强制与禁用 → no-legal-recommendation（被禁用方胜出，不放非法阵型）', () => {
    const scenario = buildScenario('v-conflict', {
      forcedHeroes: ['h1'],
      bannedHeroes: ['h1'],
    })
    const collections = buildCollections([scenario])
    const profile = createUserProfileSnapshot({
      ownedHeroes: heroIds.map((id) => createOwnedHero({ heroId: id, level: 100 })),
    })

    const recommendation = buildPlannerRecommendation({
      variant: buildVariant('v-conflict'),
      collections,
      profileSnapshot: profile,
    })

    // forced 让 h1 进候选，但 checkFormationLegality 把它判 bannedChampion → 全部 beam 结果非法
    expect(recommendation.blocker).toBe('no-legal-recommendation')
    expect(recommendation.result).toBeNull()
  })
})

describe('runtime edge — 损坏个人快照', () => {
  it('level=NaN 的拥有英雄不崩溃，DPS 比较仍可排序（NaN 兜底为 DEFAULT_CARRY_LEVEL）', () => {
    const scenario = buildScenario('v-nan')
    const collections = buildCollections([scenario])
    const profile = createUserProfileSnapshot({
      ownedHeroes: heroIds.map((id) => createOwnedHero({ heroId: id, level: Number.NaN })),
    })

    const evaluation = evaluateFormation({
      variant: buildVariant('v-nan'),
      collections,
      profileSnapshot: profile,
      placements: { s1: 'h1' },
    })

    // 不抛异常；NaN dps 与 ZERO 比较恒 false → bestCarryHeroId=null、objectiveValue 静默归零。
    // normalizer 的 toNumberValue 防 NaN（finite 守卫），此场景仅腐蚀的 IndexedDB 快照可触发。
    expect(evaluation.result).not.toBeNull()
    expect(evaluation.result!.objectiveValue).toBe('0')
    expect(evaluation.result!.carryHeroId).toBeNull()
  })

  it('放置了 plannerHeroes 之外的英雄 id → 不崩溃，附 restriction warning（按 level 1 估算）', () => {
    const scenario = buildScenario('v-unknown')
    const collections = buildCollections([scenario])
    const profile = createUserProfileSnapshot()

    const evaluation = evaluateFormation({
      variant: buildVariant('v-unknown'),
      collections,
      profileSnapshot: profile,
      placements: { s1: 'nonexistent-hero' },
    })

    expect(evaluation.result).not.toBeNull()
    expect(evaluation.result!.warnings.some((w) => w.includes('nonexistent-hero'))).toBe(true)
  })
})

describe('runtime edge — 空/极端阵型', () => {
  it('空 placements → objectiveValue 为零、breakdown=null（scoreFormation 早返回）', () => {
    const scenario = buildScenario('v-empty')
    const collections = buildCollections([scenario])
    const profile = createUserProfileSnapshot()

    const evaluation = evaluateFormation({
      variant: buildVariant('v-empty'),
      collections,
      profileSnapshot: profile,
      placements: {},
    })

    expect(evaluation.result).not.toBeNull()
    expect(evaluation.result!.objectiveValue).toBe('0')
    expect(evaluation.result!.breakdown).toBeNull()
  })

  it('候选不足填满槽位 → insufficient-owned-heroes blocker', () => {
    const scenario = buildScenario('v-insufficient')
    const collections = buildCollections([scenario])
    // 只拥有 1 个英雄，但场景需要填 2 个可用槽位
    const profile = createUserProfileSnapshot({
      ownedHeroes: [createOwnedHero({ heroId: 'h1', level: 100 })],
    })

    const recommendation = buildPlannerRecommendation({
      variant: buildVariant('v-insufficient'),
      collections,
      profileSnapshot: profile,
    })

    expect(recommendation.blocker).toBe('insufficient-owned-heroes')
    expect(recommendation.result).toBeNull()
  })
})

describe('runtime edge — malformed override', () => {
  it('override 条目缺 heroId（损坏/旧 shape）→ 被静默忽略，不污染 profile', () => {
    // 模拟 IndexedDB/集合里读到缺 heroId 的条目：map 建键为 undefined，永不匹配真实英雄
    const malformed = [{ carrySignals: [{ kind: 'heroDpsMultiplier', value: 999, rawEffect: 'x' }] }] as never[]

    const resolved = resolveHeroAbilityProfiles(plannerHeroes, [], malformed)
    expect(resolved.every((hero) => hero.carrySignals.length === 0)).toBe(true)
  })
})
