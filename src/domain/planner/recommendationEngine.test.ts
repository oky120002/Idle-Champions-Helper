import { describe, expect, it } from 'vitest'

import type { Champion, LocalizedOption, LocalizedText, Variant } from '../types'
import { buildPlannerRecommendation } from './recommendationEngine'
import type { HeroAbilityProfile } from '../abilities/abilityModel'
import type { OfficialPlannerScenarioModel } from './plannerModel'
import type { PlannerCollections } from './recommendationTypes'
import { createOwnedHero, createUserProfileSnapshot } from '../user-profile/fixtures'

function text(original: string, display = original): LocalizedText {
  return { original, display }
}

function option(id: string, original: string, display = original): LocalizedOption {
  return { id, original, display }
}

function createVariant(id: string, overrides: Partial<Variant> & Pick<Variant, 'campaign' | 'name'>): Variant {
  return {
    id,
    campaign: overrides.campaign,
    name: overrides.name,
    adventureId: overrides.adventureId ?? null,
    adventure: overrides.adventure ?? null,
    objectiveArea: overrides.objectiveArea ?? null,
    locationId: overrides.locationId ?? null,
    areaSetId: overrides.areaSetId ?? null,
    scene: overrides.scene ?? null,
    restrictions: overrides.restrictions ?? [],
    rewards: overrides.rewards ?? [],
    enemyCount: overrides.enemyCount ?? 0,
    enemyTypes: overrides.enemyTypes ?? [],
    attackMix: overrides.attackMix ?? { melee: 0, ranged: 0, magic: 0, other: 0 },
    specialEnemyCount: overrides.specialEnemyCount ?? 0,
    escortCount: overrides.escortCount ?? 0,
    areaHighlights: overrides.areaHighlights ?? [],
    areaMilestones: overrides.areaMilestones ?? [],
    mechanics: overrides.mechanics ?? [],
    forcedHeroIds: overrides.forcedHeroIds ?? [],
    allowedHeroIds: overrides.allowedHeroIds ?? [],
    allowedTags: overrides.allowedTags ?? [],
  }
}

const campaign = option('campaign-a', 'Grand Tour', '剑湾之旅')

const selectedVariant = createVariant('variant-1', {
  campaign,
  name: text('Archer Barrage', '弓兵压制'),
  adventureId: 'adventure-1',
  adventure: text('Catacombs', '墓穴深处'),
  objectiveArea: 125,
  restrictions: [text('Keep archers contained', '压住弓兵波次')],
})

const lockedSlotVariant = createVariant('variant-locked', {
  campaign,
  name: text('Escort Run', '护送任务'),
  adventureId: 'adventure-2',
  adventure: text('Escort', '护送'),
  objectiveArea: 100,
})

const champions: Champion[] = [
  { id: 'bruenor', name: text('Bruenor', '布鲁诺'), seat: 1, roles: ['support'], affiliations: [], tags: [] },
  { id: 'asharra', name: text('Asharra', '阿莎拉'), seat: 1, roles: ['dps', 'support'], affiliations: [], tags: [] },
  { id: 'celeste', name: text('Celeste', '塞莱斯特'), seat: 2, roles: ['healing', 'support'], affiliations: [], tags: [] },
  { id: 'nayeli', name: text('Nayeli', '纳耶里'), seat: 3, roles: ['tanking'], affiliations: [], tags: [] },
  { id: 'jarlaxle', name: text('Jarlaxle', '贾拉索'), seat: 4, roles: ['dps', 'gold'], affiliations: [], tags: [] },
]

const plannerHeroes: HeroAbilityProfile[] = champions.map((champion) => ({
  heroId: champion.id,
  name: champion.name,
  seat: champion.seat,
  roles: champion.roles,
  tags: champion.tags,
  baseAttackDamageTypes: [],
  baseAttackCooldown: null,
  age: null,
  abilityScores: {},
  baseDamage: 1,
  baseHealth: 1,
  carrySignals: champion.id === 'asharra'
    ? [
        { kind: 'heroDpsMultiplier', value: 100, rawEffect: 'hero_dps_multiplier_mult,100', source: 'official-parsed' },
      ]
    : champion.id === 'jarlaxle'
      ? [
          { kind: 'heroDpsMultiplier', value: 25, rawEffect: 'hero_dps_multiplier_mult,25', source: 'official-parsed' },
        ]
      : [],
  supportSignals: champion.id === 'bruenor'
    ? [
        { kind: 'adjacentBuff', value: 100, rawEffect: 'adjacent_buff,100', source: 'official-parsed' },
      ]
    : champion.id === 'celeste'
      ? [
          { kind: 'globalDpsMultiplier', value: 50, rawEffect: 'global_dps_multiplier_mult,50', source: 'official-parsed' },
        ]
      : [],
  unsupportedSignals: [],
  sourceBreakdown: {
    carrySignals: [],
    supportSignals: [],
    unsupportedSignals: [],
  },
}))

const plannerScenarios: OfficialPlannerScenarioModel[] = [
  {
    variantId: selectedVariant.id,
    scenarioRef: { kind: 'variant', id: selectedVariant.id },
    name: selectedVariant.name,
    formationLayoutId: 'layout-catacombs',
    objectiveArea: selectedVariant.objectiveArea,
    slotTopology: [
      { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
      { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
      { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2', 's4'] },
      { slotId: 's4', row: 1, column: 4, adjacentSlotIds: ['s3'] },
    ],
    forcedHeroes: [],
    bannedHeroes: [],
    lockedSlots: [],
    enemyTypes: [],
    allowedHeroes: [],
    allowedTags: [],
    scenarioWarnings: ['当前推荐尚未解析场景限制与机制，只按已拥有英雄、seat 合法性和阵型槽位计算。'],
  },
  {
    variantId: lockedSlotVariant.id,
    scenarioRef: { kind: 'variant', id: lockedSlotVariant.id },
    name: lockedSlotVariant.name,
    formationLayoutId: 'layout-escort',
    objectiveArea: lockedSlotVariant.objectiveArea,
    slotTopology: [
      { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
      { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
      { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2', 's4'] },
      { slotId: 's4', row: 1, column: 4, adjacentSlotIds: ['s3'] },
    ],
    forcedHeroes: [],
    bannedHeroes: [],
    lockedSlots: ['s4'],
    enemyTypes: [],
    allowedHeroes: [],
    allowedTags: [],
    scenarioWarnings: ['当前场景含护送任务，前排一个槽位预留给护送目标，不参与英雄占位。'],
  },
]

const collections: PlannerCollections = {
  variants: [selectedVariant, lockedSlotVariant],
  plannerHeroes,
  plannerScenarios,
}

describe('planner recommendation engine', () => {
  it('无用户快照时返回 missing-profile blocker', () => {
    const recommendation = buildPlannerRecommendation(selectedVariant, collections, null)

    expect(recommendation.blocker).toBe('missing-profile')
    expect(recommendation.result).toBeNull()
    expect(recommendation.layoutId).toBeNull()
    expect(recommendation.scenarioRef).toEqual({ kind: 'variant', id: 'variant-1' })
  })

  it('推荐结果停留在领域层契约，不依赖页面组件类型', () => {
    const snapshot = createUserProfileSnapshot({
      ownedHeroes: [
        createOwnedHero({ heroId: 'bruenor', level: 500 }),
        createOwnedHero({ heroId: 'asharra', level: 500 }),
        createOwnedHero({ heroId: 'celeste', level: 500 }),
        createOwnedHero({ heroId: 'nayeli', level: 500 }),
        createOwnedHero({ heroId: 'jarlaxle', level: 500 }),
      ],
    })

    const recommendation = buildPlannerRecommendation(selectedVariant, collections, snapshot)

    expect(recommendation.blocker).toBeNull()
    expect(recommendation.layoutId).toBe('layout-catacombs')
    expect(recommendation.result).not.toBeNull()
    expect(recommendation.result?.placementEntries).toBeDefined()
    expect(recommendation.result?.placementEntries).toHaveLength(4)

    const seatOneEntries = recommendation.result?.placementEntries?.filter((entry) => entry.seat === 1) ?? []
    expect(seatOneEntries).toHaveLength(1)
    expect(seatOneEntries[0]?.heroId).toBe('bruenor')
    expect(recommendation.result?.explanations[1]?.zh).toContain('贾拉索')
  })

  it('lockedSlots 被过滤，推荐不占用锁槽且减少可用槽位（9.1 escort）', () => {
    const snapshot = createUserProfileSnapshot({
      ownedHeroes: [
        createOwnedHero({ heroId: 'bruenor', level: 500 }),
        createOwnedHero({ heroId: 'asharra', level: 500 }),
        createOwnedHero({ heroId: 'celeste', level: 500 }),
        createOwnedHero({ heroId: 'nayeli', level: 500 }),
        createOwnedHero({ heroId: 'jarlaxle', level: 500 }),
      ],
    })

    const recommendation = buildPlannerRecommendation(lockedSlotVariant, collections, snapshot)

    expect(recommendation.blocker).toBeNull()
    expect(recommendation.result?.placementEntries).toHaveLength(3)
    expect(recommendation.result?.placements.s4).toBeUndefined()
  })

  it('only_allow_crusaders 白名单过滤候选英雄，非白名单英雄不被推荐（9.2）', () => {
    const allowedVariant = createVariant('variant-allowed', {
      campaign,
      name: text('Allowed Only', '仅限白名单'),
      adventureId: 'adventure-allowed',
      adventure: text('Allowed', '白名单'),
      objectiveArea: 100,
      allowedHeroIds: ['bruenor', 'celeste', 'nayeli', 'jarlaxle'],
    })
    const allowedScenario: OfficialPlannerScenarioModel = {
      variantId: allowedVariant.id,
      scenarioRef: { kind: 'variant', id: allowedVariant.id },
      name: allowedVariant.name,
      formationLayoutId: 'layout-catacombs',
      objectiveArea: 100,
      slotTopology: [
        { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
        { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
        { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2', 's4'] },
        { slotId: 's4', row: 1, column: 4, adjacentSlotIds: ['s3'] },
      ],
      forcedHeroes: [],
      bannedHeroes: [],
      lockedSlots: [],
      enemyTypes: [],
      allowedHeroes: ['bruenor', 'celeste', 'nayeli', 'jarlaxle'],
      allowedTags: [],
      scenarioWarnings: [],
    }
    const allowedCollections: PlannerCollections = {
      variants: [allowedVariant],
      plannerHeroes,
      plannerScenarios: [allowedScenario],
    }
    const snapshot = createUserProfileSnapshot({
      ownedHeroes: [
        createOwnedHero({ heroId: 'bruenor', level: 500 }),
        createOwnedHero({ heroId: 'asharra', level: 500 }),
        createOwnedHero({ heroId: 'celeste', level: 500 }),
        createOwnedHero({ heroId: 'nayeli', level: 500 }),
        createOwnedHero({ heroId: 'jarlaxle', level: 500 }),
      ],
    })

    const recommendation = buildPlannerRecommendation(allowedVariant, allowedCollections, snapshot)

    expect(recommendation.blocker).toBeNull()
    expect(recommendation.result).not.toBeNull()
    const placedHeroIds = Object.values(recommendation.result?.placements ?? {})
    // asharra 不在白名单（allowedHeroes），即使已拥有也不被推荐
    expect(placedHeroIds).not.toContain('asharra')
    expect(placedHeroIds).toContain('bruenor')
  })

  it('force_use_heroes 强制英雄即使未拥有也纳入候选并占位（9.2）', () => {
    const forcedVariant = createVariant('variant-forced', {
      campaign,
      name: text('Forced Hero', '强制英雄'),
      adventureId: 'adventure-forced',
      adventure: text('Forced', '强制'),
      objectiveArea: 100,
      forcedHeroIds: ['nayeli'],
    })
    const forcedScenario: OfficialPlannerScenarioModel = {
      variantId: forcedVariant.id,
      scenarioRef: { kind: 'variant', id: forcedVariant.id },
      name: forcedVariant.name,
      formationLayoutId: 'layout-catacombs',
      objectiveArea: 100,
      slotTopology: [
        { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
        { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
        { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2', 's4'] },
        { slotId: 's4', row: 1, column: 4, adjacentSlotIds: ['s3'] },
      ],
      forcedHeroes: ['nayeli'],
      bannedHeroes: [],
      lockedSlots: [],
      enemyTypes: [],
      allowedHeroes: [],
      allowedTags: [],
      scenarioWarnings: [],
    }
    const forcedCollections: PlannerCollections = {
      variants: [forcedVariant],
      plannerHeroes,
      plannerScenarios: [forcedScenario],
    }
    // 用户未拥有 nayeli，但 force_use_heroes 强制纳入
    const snapshot = createUserProfileSnapshot({
      ownedHeroes: [
        createOwnedHero({ heroId: 'bruenor', level: 500 }),
        createOwnedHero({ heroId: 'celeste', level: 500 }),
        createOwnedHero({ heroId: 'jarlaxle', level: 500 }),
      ],
    })

    const recommendation = buildPlannerRecommendation(forcedVariant, forcedCollections, snapshot)

    expect(recommendation.blocker).toBeNull()
    expect(recommendation.result).not.toBeNull()
    const placedHeroIds = Object.values(recommendation.result?.placements ?? {})
    expect(placedHeroIds).toContain('nayeli')
  })
})
