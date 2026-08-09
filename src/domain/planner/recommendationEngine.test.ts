import { describe, expect, it } from 'vitest'

import type { Champion, LocalizedOption, LocalizedText, Variant } from '../types'
import type { HeroAbilityProfile } from '../abilities/abilityModel'
import { createOwnedHero, createUserProfileSnapshot } from '../user-profile/fixtures'
import { buildPlannerRecommendation, evaluateFormation } from './recommendationEngine'
import { type OfficialPlannerScenarioModel, EMPTY_VIABILITY_CONTEXT } from './plannerModel'
import type { PlannerCollections } from './recommendationTypes'

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
    allowedTagExpression: overrides.allowedTagExpression ?? [],
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

const champions: Champion[] = [
  { id: 'bruenor', name: text('Bruenor', '布鲁诺'), seat: 1, roles: ['support'], affiliations: [], tags: [] },
  { id: 'asharra', name: text('Asharra', '阿莎拉'), seat: 1, roles: ['dps', 'support'], affiliations: [], tags: [] },
  { id: 'celeste', name: text('Celeste', '塞莱斯特'), seat: 2, roles: ['healing', 'support'], affiliations: [], tags: [] },
  { id: 'nayeli', name: text('Nayeli', '纳耶里'), seat: 3, roles: ['tanking'], affiliations: [], tags: [] },
  { id: 'jarlaxle', name: text('Jarlaxle', '贾拉索'), seat: 4, roles: ['dps', 'gold'], affiliations: [], tags: [] },
]

const carrySignalsByHero = new Map<string, HeroAbilityProfile['carrySignals']>([
  ['asharra', [{ kind: 'heroDpsMultiplier', value: 100, rawEffect: 'hero_dps_multiplier_mult,100', source: 'official-parsed' }]],
  ['jarlaxle', [{ kind: 'heroDpsMultiplier', value: 25, rawEffect: 'hero_dps_multiplier_mult,25', source: 'official-parsed' }]],
])
const supportSignalsByHero = new Map<string, HeroAbilityProfile['supportSignals']>([
  ['bruenor', [{ kind: 'globalDpsMultiplier', value: 100, rawEffect: 'global_dps_multiplier_mult,100', source: 'official-parsed' }]],
  ['celeste', [{ kind: 'globalDpsMultiplier', value: 50, rawEffect: 'global_dps_multiplier_mult,50', source: 'official-parsed' }]],
])
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
  carrySignals: carrySignalsByHero.get(champion.id) ?? [],
  supportSignals: supportSignalsByHero.get(champion.id) ?? [],
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
    enemyTypes: [],
    allowedHeroes: [],
    allowedTagExpression: [],
        attributeRequirements: [],
      occupiedSlotCount: 0,
    viabilityContext: EMPTY_VIABILITY_CONTEXT,
    damageSourcePattern: null,
    scenarioWarnings: ['当前推荐尚未解析场景限制与机制，只按已拥有英雄、seat 合法性和阵型槽位计算。'],
  },
]

const collections: PlannerCollections = {
  variants: [selectedVariant],
  plannerHeroes,
  plannerScenarios,
}

// 护甲变体：200 段护甲 + 阈值检查
const armorVariant = createVariant('variant-armor', {
  campaign,
  name: text('Armored Assault', '装甲突袭'),
  adventureId: 'adventure-armor',
  adventure: text('Armored Catacombs', '装甲墓穴'),
  objectiveArea: 50,
  restrictions: [text('It has 200 armored hit points.', '拥有 200 段护甲生命值。')],
})

const armorCollections: PlannerCollections = {
  variants: [armorVariant],
  plannerHeroes,
  plannerScenarios: [
    {
      variantId: armorVariant.id,
      scenarioRef: { kind: 'variant', id: armorVariant.id },
      name: armorVariant.name,
      formationLayoutId: 'layout-armor',
      objectiveArea: armorVariant.objectiveArea,
      slotTopology: [
        { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
        { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
        { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2', 's4'] },
        { slotId: 's4', row: 1, column: 4, adjacentSlotIds: ['s3'] },
      ],
      forcedHeroes: [],
      enemyTypes: [],
      allowedHeroes: [],
      allowedTagExpression: [],
      attributeRequirements: [],
      occupiedSlotCount: 0,
      viabilityContext: { armor: { segments: 200 }, hitsBased: null, damageModifier: null, enemyDamageMult: null, healthDrainRate: null },
    damageSourcePattern: null,
      scenarioWarnings: [],
    },
  ],
}

// 命中型变体（无护甲）：20 段命中型 + 阈值检查（验证 hitsBased-only 过滤不漏）
const hitsVariant = createVariant('variant-hits', {
  campaign,
  name: text('Hits-Based Horde', '命中型部落'),
  adventureId: 'adventure-hits',
  adventure: text('Hits-Based Catacombs', '命中型墓穴'),
  objectiveArea: 50,
  restrictions: [text('It has 20 hits-based hit points.', '拥有 20 段命中型生命值。')],
})

const hitsCollections: PlannerCollections = {
  variants: [hitsVariant],
  plannerHeroes,
  plannerScenarios: [
    {
      variantId: hitsVariant.id,
      scenarioRef: { kind: 'variant', id: hitsVariant.id },
      name: hitsVariant.name,
      formationLayoutId: 'layout-hits',
      objectiveArea: hitsVariant.objectiveArea,
      slotTopology: [
        { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
        { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
        { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2', 's4'] },
        { slotId: 's4', row: 1, column: 4, adjacentSlotIds: ['s3'] },
      ],
      forcedHeroes: [],
      enemyTypes: [],
      allowedHeroes: [],
      allowedTagExpression: [],
      attributeRequirements: [],
      occupiedSlotCount: 0,
      viabilityContext: { armor: null, hitsBased: { segments: 20 }, damageModifier: null, enemyDamageMult: null, healthDrainRate: null },
      damageSourcePattern: null,
      scenarioWarnings: [],
    },
  ],
}

// 伤害削减变体：99% 减伤 → killableArea 大幅降低（验证 area 统一过滤覆盖 damageModifier）
const damageModVariant = createVariant('variant-dmgmod', {
  campaign,
  name: text('Damage Reduction', '伤害削减'),
  adventureId: 'adventure-dmgmod',
  adventure: text('Reduced Catacombs', '削减墓穴'),
  objectiveArea: 50,
  restrictions: [text('Champion damage is reduced by 99%.', '英雄伤害削减 99%。')],
})

const damageModCollections: PlannerCollections = {
  variants: [damageModVariant],
  plannerHeroes,
  plannerScenarios: [
    {
      variantId: damageModVariant.id,
      scenarioRef: { kind: 'variant', id: damageModVariant.id },
      name: damageModVariant.name,
      formationLayoutId: 'layout-dmgmod',
      objectiveArea: damageModVariant.objectiveArea,
      slotTopology: [
        { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
        { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
        { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2', 's4'] },
        { slotId: 's4', row: 1, column: 4, adjacentSlotIds: ['s3'] },
      ],
      forcedHeroes: [],
      enemyTypes: [],
      allowedHeroes: [],
      allowedTagExpression: [],
      attributeRequirements: [],
      occupiedSlotCount: 0,
      viabilityContext: { armor: null, hitsBased: null, damageModifier: 0.01, enemyDamageMult: null, healthDrainRate: null },
      damageSourcePattern: null,
      scenarioWarnings: [],
    },
  ],
}

describe('planner recommendation engine', () => {
  it('无用户快照时返回 missing-profile blocker', () => {
    const recommendation = buildPlannerRecommendation({ collections, variant: selectedVariant, profileSnapshot: null })

    expect(recommendation.blocker).toBe('missing-profile')
    expect(recommendation.result).toBeNull()
    expect(recommendation.layoutId).toBeNull()
    expect(recommendation.scenarioRef).toEqual({ kind: 'variant', id: 'variant-1' })
  })

  it('all-hypothetical 模式无个人快照也能生成推荐（DPS 模拟不依赖个人数据）', () => {
    const recommendation = buildPlannerRecommendation({
      collections,
      variant: selectedVariant,
      profileSnapshot: null,
      options: { candidateMode: 'all-hypothetical' },
    })

    expect(recommendation.blocker).not.toBe('missing-profile')
    expect(recommendation.results.length).toBeGreaterThan(0)
    expect(recommendation.layoutId).toBe('layout-catacombs')
  })

  it('evaluateFormation 在 all-hypothetical 模式无个人快照也能评估指定阵型', () => {
    const evaluation = evaluateFormation({
      collections,
      variant: selectedVariant,
      profileSnapshot: null,
      placements: { s1: 'bruenor', s2: 'celeste', s3: 'nayeli', s4: 'jarlaxle' },
      options: { candidateMode: 'all-hypothetical' },
    })

    expect(evaluation.blocker).not.toBe('missing-profile')
    expect(evaluation.result).not.toBeNull()
    expect(evaluation.result?.placements).toEqual({
      s1: 'bruenor',
      s2: 'celeste',
      s3: 'nayeli',
      s4: 'jarlaxle',
    })
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

    const recommendation = buildPlannerRecommendation({
      collections,
      variant: selectedVariant,
      profileSnapshot: snapshot,
      options: { computationMode: 'full' },
    })

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

  it('team-gold 模式叙述按金币收益，不误用 carryDps 文案', () => {
    const snapshot = createUserProfileSnapshot({
      ownedHeroes: [
        createOwnedHero({ heroId: 'bruenor', level: 500 }),
        createOwnedHero({ heroId: 'asharra', level: 500 }),
        createOwnedHero({ heroId: 'celeste', level: 500 }),
        createOwnedHero({ heroId: 'nayeli', level: 500 }),
        createOwnedHero({ heroId: 'jarlaxle', level: 500 }),
      ],
    })

    const evaluation = evaluateFormation({
      collections,
      variant: selectedVariant,
      profileSnapshot: snapshot,
      placements: { s1: 'bruenor', s2: 'celeste', s3: 'nayeli', s4: 'jarlaxle' },
      options: { scoringMode: 'team-gold' },
    })

    expect(evaluation.result).not.toBeNull()
    const zh = evaluation.result?.explanations.map((line) => line.zh).join('') ?? ''
    expect(zh).toContain('金币收益')
    expect(zh).not.toContain('carryDps')
  })

  it('occupiedSlotCount 扣减可用容量，推荐只填剩余槽位（12.3 restrictions）', () => {
    // 4 格阵型 − occupiedSlotCount 2 = 2 可用；推荐只填 2 个英雄（修复前会填满 4 格高估 carryDps）。
    const occupiedVariant = createVariant('variant-occupied', {
      campaign,
      name: text('Cursed Slots', '诅咒之格'),
      adventureId: 'adventure-occupied',
      adventure: text('Cursed', '诅咒'),
      objectiveArea: 100,
    })
    const occupiedScenario: OfficialPlannerScenarioModel = {
      variantId: occupiedVariant.id,
      scenarioRef: { kind: 'variant', id: occupiedVariant.id },
      name: occupiedVariant.name,
      formationLayoutId: 'layout-catacombs',
      objectiveArea: 100,
      slotTopology: [
        { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
        { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
        { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2', 's4'] },
        { slotId: 's4', row: 1, column: 4, adjacentSlotIds: ['s3'] },
      ],
      forcedHeroes: [],
      enemyTypes: [],
      allowedHeroes: [],
      allowedTagExpression: [],
      attributeRequirements: [],
      occupiedSlotCount: 2,
    viabilityContext: EMPTY_VIABILITY_CONTEXT,
    damageSourcePattern: null,
      scenarioWarnings: ['当前场景有 2 个槽位被非英雄实体占据，不参与英雄占位。'],
    }
    const occupiedCollections: PlannerCollections = {
      plannerHeroes,
      variants: [occupiedVariant],
      plannerScenarios: [occupiedScenario],
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

    const recommendation = buildPlannerRecommendation({
      variant: occupiedVariant,
      collections: occupiedCollections,
      profileSnapshot: snapshot,
      options: { computationMode: 'full' },
    })

    expect(recommendation.blocker).toBeNull()
    expect(recommendation.result?.placementEntries).toHaveLength(2)
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
      enemyTypes: [],
      allowedHeroes: ['bruenor', 'celeste', 'nayeli', 'jarlaxle'],
      allowedTagExpression: [],
        attributeRequirements: [],
      occupiedSlotCount: 0,
    viabilityContext: EMPTY_VIABILITY_CONTEXT,
    damageSourcePattern: null,
      scenarioWarnings: [],
    }
    const allowedCollections: PlannerCollections = {
      plannerHeroes,
      variants: [allowedVariant],
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

    const recommendation = buildPlannerRecommendation({
      variant: allowedVariant,
      collections: allowedCollections,
      profileSnapshot: snapshot,
      options: { computationMode: 'full' },
    })

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
      enemyTypes: [],
      allowedHeroes: [],
      allowedTagExpression: [],
        attributeRequirements: [],
      occupiedSlotCount: 0,
    viabilityContext: EMPTY_VIABILITY_CONTEXT,
    damageSourcePattern: null,
      scenarioWarnings: [],
    }
    const forcedCollections: PlannerCollections = {
      plannerHeroes,
      variants: [forcedVariant],
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

    const recommendation = buildPlannerRecommendation({
      variant: forcedVariant,
      collections: forcedCollections,
      profileSnapshot: snapshot,
      options: { computationMode: 'full' },
    })

    expect(recommendation.blocker).toBeNull()
    expect(recommendation.result).not.toBeNull()
    const placedHeroIds = Object.values(recommendation.result?.placements ?? {})
    expect(placedHeroIds).toContain('nayeli')
  })
})

describe('evaluateFormation 指定阵型评估', () => {
  const snapshot = createUserProfileSnapshot({
    ownedHeroes: [
      createOwnedHero({ heroId: 'bruenor', level: 500 }),
      createOwnedHero({ heroId: 'asharra', level: 500 }),
      createOwnedHero({ heroId: 'celeste', level: 500 }),
      createOwnedHero({ heroId: 'nayeli', level: 500 }),
      createOwnedHero({ heroId: 'jarlaxle', level: 500 }),
    ],
  })

  it('无快照时返回 missing-profile blocker', () => {
    const evaluation = evaluateFormation({ collections, variant: selectedVariant, profileSnapshot: null, placements: { s1: 'bruenor' } })
    expect(evaluation.blocker).toBe('missing-profile')
    expect(evaluation.result).toBeNull()
    expect(evaluation.scenarioRef).toEqual({ kind: 'variant', id: 'variant-1' })
  })

  it('评估给定阵型，原样返回 placements 与对应 breakdown（不搜索）', () => {
    // 刻意放一个非最优阵型：验证 evaluateFormation 不改成搜索结果。
    const placements = { s1: 'bruenor', s2: 'asharra', s3: 'celeste', s4: 'nayeli' }

    const evaluation = evaluateFormation({ variant: selectedVariant, profileSnapshot: snapshot, collections, placements })

    expect(evaluation.blocker).toBeNull()
    expect(evaluation.layoutId).toBe('layout-catacombs')
    expect(evaluation.slots).toHaveLength(4)
    expect(evaluation.result).not.toBeNull()
    // 不搜索：placements 原样返回
    expect(evaluation.result?.placements).toEqual(placements)
    expect(evaluation.result?.placementEntries).toHaveLength(4)
    // breakdown 透传且自洽：carryHeroId 与顶层一致、contributions 非空、carryDps 为字符串
    const breakdown = evaluation.result?.breakdown
    expect(breakdown).not.toBeNull()
    expect(breakdown?.carryHeroId).toBe(evaluation.result?.carryHeroId)
    expect(breakdown?.contributions.length).toBeGreaterThan(0)
    expect(typeof breakdown?.carryDps).toBe('string')
    expect(breakdown?.carryDps.length).toBeGreaterThan(0)
    // placementEntries 覆盖所有放置槽位
    const entrySlots = evaluation.result?.placementEntries?.map((entry) => entry.slotId) ?? []
    expect(entrySlots).toEqual(Object.keys(placements))
  })

  it('seat 冲突的非法阵型：附加合法性 warning 但仍输出拆解', () => {
    // bruenor 与 asharra 同属 seat 1，放不同槽位 → seat 冲突（evaluate 不搜索、不丢弃用户阵型）。
    const placements = { s1: 'bruenor', s2: 'asharra' }

    const evaluation = evaluateFormation({ variant: selectedVariant, profileSnapshot: snapshot, collections, placements })

    expect(evaluation.blocker).toBeNull()
    expect(evaluation.result?.warnings.some((warning) => warning.includes('冲突'))).toBe(true)
    expect(evaluation.result?.breakdown).not.toBeNull()
    expect(evaluation.result?.placements).toEqual(placements)
  })

  it('only_allow_crusaders 白名单外的英雄附加 warning（与 build 候选过滤对称）', () => {
    // build 在候选阶段过滤非白名单英雄；evaluate 不改用户阵型，但须把白名单违规标为 warning。
    const allowedVariant = createVariant('variant-allowed-eval', {
      campaign,
      name: text('Allowed Eval', '评估白名单'),
      adventureId: 'adventure-allowed-eval',
      adventure: text('Allowed', '白名单'),
      objectiveArea: 100,
    })
    const allowedScenario: OfficialPlannerScenarioModel = {
      variantId: allowedVariant.id,
      scenarioRef: { kind: 'variant', id: allowedVariant.id },
      name: allowedVariant.name,
      formationLayoutId: 'layout-allowed-eval',
      objectiveArea: 100,
      slotTopology: [
        { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
        { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1'] },
      ],
      forcedHeroes: [],
      enemyTypes: [],
      allowedHeroes: ['bruenor', 'celeste', 'nayeli', 'jarlaxle'],
      allowedTagExpression: [],
      attributeRequirements: [],
      occupiedSlotCount: 0,
    viabilityContext: EMPTY_VIABILITY_CONTEXT,
    damageSourcePattern: null,
      scenarioWarnings: [],
    }
    const allowedCollections: PlannerCollections = {
      plannerHeroes,
      variants: [allowedVariant],
      plannerScenarios: [allowedScenario],
    }
    // asharra 不在白名单
    const evaluation = evaluateFormation({ variant: allowedVariant, collections: allowedCollections, profileSnapshot: snapshot, placements: { s1: 'asharra' } })

    expect(evaluation.result?.warnings.some((warning) => warning.includes('asharra') && warning.includes('允许'))).toBe(true)
    // 白名单内的 bruenor 不触发
    const bruenorEval = evaluateFormation({ variant: allowedVariant, collections: allowedCollections, profileSnapshot: snapshot, placements: { s1: 'bruenor' } })
    expect(bruenorEval.result?.warnings.some((warning) => warning.includes('bruenor') && warning.includes('允许'))).toBe(false)
  })

  it('owned-only 下放置未拥有英雄附加 level 估算 warning', () => {
    const smallSnapshot = createUserProfileSnapshot({
      ownedHeroes: [createOwnedHero({ heroId: 'bruenor', level: 500 })],
    })
    // asharra 未在快照中（snapshot 只拥有 bruenor）→ 按 level 1 估算
    const evaluation = evaluateFormation({ collections, variant: selectedVariant, profileSnapshot: smallSnapshot, placements: { s1: 'asharra' } })

    expect(evaluation.result?.warnings.some((warning) => warning.includes('asharra') && warning.includes('level 1'))).toBe(true)
  })

  it('all-hypothetical 下未拥有英雄不触发 level 警告（候选覆盖全部）', () => {
    const smallSnapshot = createUserProfileSnapshot({
      ownedHeroes: [createOwnedHero({ heroId: 'bruenor', level: 500 })],
    })
    const evaluation = evaluateFormation({
      collections,
      variant: selectedVariant,
      profileSnapshot: smallSnapshot,
      placements: { s1: 'asharra' },
      options: { candidateMode: 'all-hypothetical' },
    })

    expect(evaluation.result?.warnings.some((warning) => warning.includes('asharra') && warning.includes('level 1'))).toBe(false)
  })
})

describe('viability: survival constraint', () => {
  it('minSurvivableArea 过滤掉生存能力不足的阵型', () => {
    // all-hypothetical 模式，level 1 英雄 baseHealth=1 → effectiveHealth≈1.06，
    // monsterDpsAt(1-49)=1 → survivableArea≈49。设阈值 50 应全部淘汰。
    const recommendation = buildPlannerRecommendation({
      collections,
      variant: selectedVariant,
      profileSnapshot: null,
      options: { candidateMode: 'all-hypothetical', minSurvivableArea: 50 },
    })
    expect(recommendation.blocker).toBe('no-legal-recommendation')
    expect(recommendation.results.length).toBe(0)
  })

  it('未设 minSurvivableArea 时正常返回结果（仅报告不过滤）', () => {
    const recommendation = buildPlannerRecommendation({
      collections,
      variant: selectedVariant,
      profileSnapshot: null,
      options: { candidateMode: 'all-hypothetical' },
    })
    expect(recommendation.blocker).toBeNull()
    expect(recommendation.results.length).toBeGreaterThan(0)
  })
})

describe('viability: armor constraint', () => {
  it('护甲变体 + minSurvivableArea 过滤击杀能力不足的阵型', () => {
    // all-hypothetical 模式，level 1 英雄 BUD≈5 < monsterHealthAt(1)=10 → killableArea=1。
    // 200 段护甲进一步抬高门槛。survivableArea≈49。
    // 设 minSurvivableArea=10：survival 通过（49≥10），但护甲击杀不通过（killableArea=1<10）。
    const recommendation = buildPlannerRecommendation({
      collections: armorCollections,
      variant: armorVariant,
      profileSnapshot: null,
      options: { candidateMode: 'all-hypothetical', minSurvivableArea: 10 },
    })
    expect(recommendation.blocker).toBe('no-legal-recommendation')
    expect(recommendation.results.length).toBe(0)
  })

  it('护甲变体未设 minSurvivableArea 时不额外过滤（仅报告）', () => {
    const recommendation = buildPlannerRecommendation({
      collections: armorCollections,
      variant: armorVariant,
      profileSnapshot: null,
      options: { candidateMode: 'all-hypothetical' },
    })
    // 无阈值 → 不过滤 → 有结果（areaEstimate 反映护甲约束但不过滤）
    expect(recommendation.results.length).toBeGreaterThan(0)
    // viability 评估：护甲在活跃约束中
    const top = recommendation.results[0]
    expect(top?.viability).not.toBeNull()
    expect(top?.viability?.activeConstraints).toContain('armor')
  })

  it('命中型变体（无护甲）+ minSurvivableArea 过滤击杀吞吐量不足的阵型', () => {
    // hitsBased-only：armor=null 但 hitsBased={segments:20}。
    // all-hypothetical 模式 level 1 BUD≈5，20 段命中型抬高吞吐量门槛。
    // survival 通过（49≥10），但击杀吞吐量不通过（killableArea=1<10）。
    const recommendation = buildPlannerRecommendation({
      collections: hitsCollections,
      variant: hitsVariant,
      profileSnapshot: null,
      options: { candidateMode: 'all-hypothetical', minSurvivableArea: 10 },
    })
    expect(recommendation.blocker).toBe('no-legal-recommendation')
    expect(recommendation.results.length).toBe(0)
  })

  it('普通变体 viability.activeConstraints 为空', () => {
    const recommendation = buildPlannerRecommendation({
      collections,
      variant: selectedVariant,
      profileSnapshot: null,
      options: { candidateMode: 'all-hypothetical' },
    })
    const top = recommendation.results[0]
    expect(top?.viability).not.toBeNull()
    expect(top?.viability?.activeConstraints).toEqual([])
  })

  it('伤害削减变体 + minSurvivableArea 过滤击杀能力不足的阵型', () => {
    // 99% 减伤 → effectiveBUD ≈ 0.05 < monsterHealthAt(1)=10 → killableArea=1。
    // survivableArea≈49（level 1 英雄不受 damageModifier 影响）。
    // 原分离检查只查 survivableArea（49≥10 通过），遗漏 killableArea=1<10。
    // 统一 area 检查后 area=min(1,49)=1<10 → 正确淘汰。
    const recommendation = buildPlannerRecommendation({
      collections: damageModCollections,
      variant: damageModVariant,
      profileSnapshot: null,
      options: { candidateMode: 'all-hypothetical', minSurvivableArea: 10 },
    })
    expect(recommendation.blocker).toBe('no-legal-recommendation')
    expect(recommendation.results.length).toBe(0)
  })
})

describe('viability: damage source pattern (K4)', () => {
  // 变体：强制英雄 Nayeli（id nayeli）在阵型中。
  // 伤害来源限制：only same-column → carry 必须与 Nayeli 同列。
  const columnVariant = createVariant('variant-col', {
    campaign,
    name: text('Column Lock', '列锁定'),
    forcedHeroIds: ['nayeli'],
  })
  // 拓扑：s1/s2 在 column 1，s3/s4 在 column 2。
  const columnScenario: OfficialPlannerScenarioModel = {
    variantId: columnVariant.id,
    scenarioRef: { kind: 'variant', id: columnVariant.id },
    name: columnVariant.name,
    formationLayoutId: 'layout-col',
    objectiveArea: columnVariant.objectiveArea,
    slotTopology: [
      { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2', 's3'] },
      { slotId: 's2', row: 2, column: 1, adjacentSlotIds: ['s1', 's3'] },
      { slotId: 's3', row: 1, column: 2, adjacentSlotIds: ['s1', 's2', 's4'] },
      { slotId: 's4', row: 2, column: 2, adjacentSlotIds: ['s2', 's3'] },
    ],
    forcedHeroes: ['nayeli'],
    enemyTypes: [],
    allowedHeroes: [],
    allowedTagExpression: [],
    attributeRequirements: [],
    occupiedSlotCount: 0,
    viabilityContext: EMPTY_VIABILITY_CONTEXT,
    damageSourcePattern: { kind: 'same-column', referenceHeroId: 'nayeli' },
    scenarioWarnings: [],
  }
  const columnCollections: PlannerCollections = {
    variants: [columnVariant],
    plannerHeroes,
    plannerScenarios: [columnScenario],
  }

  it('carry 与参考英雄同列 → 正常评分（evaluateFormation）', () => {
    // Nayeli(s3,col2) + Jarlaxle(s4,col2) → carry(Jarlaxle) 同列 → 有效
    const evaluation = evaluateFormation({
      collections: columnCollections,
      variant: columnVariant,
      profileSnapshot: null,
      placements: { s1: 'bruenor', s2: 'celeste', s3: 'nayeli', s4: 'jarlaxle' },
      options: { candidateMode: 'all-hypothetical' },
    })
    expect(evaluation.result).not.toBeNull()
    expect(evaluation.result?.objectiveValue).not.toBe('0')
  })

  it('carry 与参考英雄不同列 → SCORE_ZERO（evaluateFormation）', () => {
    // Nayeli(s1,col1) + Jarlaxle(s3,col2) → carry(Jarlaxle) 不同列 → 无效
    const evaluation = evaluateFormation({
      collections: columnCollections,
      variant: columnVariant,
      profileSnapshot: null,
      placements: { s1: 'nayeli', s2: 'bruenor', s3: 'jarlaxle', s4: 'celeste' },
      options: { candidateMode: 'all-hypothetical' },
    })
    expect(evaluation.result).not.toBeNull()
    expect(evaluation.result?.objectiveValue).toBe('0')
    expect(evaluation.result?.warnings.some((w) => w.includes('可造伤害'))).toBe(true)
  })

  it('buildPlannerRecommendation 自动避开无效 carry 位置', () => {
    // beam search 应该把 carry 放在与 Nayeli 同列的位置，或选另一个 carry。
    const recommendation = buildPlannerRecommendation({
      collections: columnCollections,
      variant: columnVariant,
      profileSnapshot: null,
      options: { candidateMode: 'all-hypothetical' },
    })
    // 应有结果（至少存在 carry 在同列的合法阵型）
    expect(recommendation.results.length).toBeGreaterThan(0)
    // 每个结果的 carry 应在同列
    for (const result of recommendation.results) {
      if (result.carryHeroId == null) continue
      const carrySlot = Object.entries(result.placements).find(([, id]) => id === result.carryHeroId)?.[0]
      const nayeliSlot = Object.entries(result.placements).find(([, id]) => id === 'nayeli')?.[0]
      if (carrySlot === undefined || nayeliSlot === undefined) continue
      const carryCol = columnScenario.slotTopology.find((s) => s.slotId === carrySlot)?.column
      const nayeliCol = columnScenario.slotTopology.find((s) => s.slotId === nayeliSlot)?.column
      expect(carryCol).toBe(nayeliCol)
    }
  })

  it('用户标记不可造伤害槽位 → carry 在该槽位时 SCORE_ZERO', () => {
    // 用户标记 s1 为不可造伤害，carry(Jarlaxle) 放在 s1 → 无效
    const evaluation = evaluateFormation({
      collections: columnCollections,
      variant: columnVariant,
      profileSnapshot: null,
      placements: { s1: 'jarlaxle', s2: 'celeste', s3: 'nayeli', s4: 'bruenor' },
      options: { candidateMode: 'all-hypothetical', userDamageDisabledSlots: ['s1'] },
    })
    expect(evaluation.result).not.toBeNull()
    expect(evaluation.result?.objectiveValue).toBe('0')
  })

  it('无 damageSourcePattern 的普通变体不受影响', () => {
    const evaluation = evaluateFormation({
      collections,
      variant: selectedVariant,
      profileSnapshot: null,
      placements: { s1: 'bruenor', s2: 'celeste', s3: 'nayeli', s4: 'jarlaxle' },
      options: { candidateMode: 'all-hypothetical' },
    })
    expect(evaluation.result).not.toBeNull()
    expect(evaluation.result?.objectiveValue).not.toBe('0')
  })
})

// damageSourcePattern 其余 4 种几何模式（adjacent/not-adjacent/front-columns/behind-columns）。
// same-column 已有测试覆盖（上方 columnScenario），此处补齐剩余模式的 valid/invalid 判定。
describe('damageSourcePattern — adjacent / not-adjacent / front-columns / behind-columns', () => {
  // 3 列拓扑：s1(col1) / s2(col2) / s3(col3) / s4(col1,row2)
  const wideTopology = [
    { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2', 's4'] },
    { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
    { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2'] },
    { slotId: 's4', row: 2, column: 1, adjacentSlotIds: ['s1'] },
  ]

  function makePatternScenario(pattern: OfficialPlannerScenarioModel['damageSourcePattern']): {
    collections: PlannerCollections
    variant: Variant
  } {
    const variant = createVariant('variant-pattern', { campaign, name: text('Pattern Test', '模式测试') })
    return {
      variant,
      collections: {
        variants: [variant],
        plannerHeroes,
        plannerScenarios: [{
          variantId: variant.id,
          scenarioRef: { kind: 'variant', id: variant.id },
          name: variant.name,
          formationLayoutId: 'layout-pattern',
          objectiveArea: variant.objectiveArea,
          slotTopology: wideTopology,
          forcedHeroes: [],
          enemyTypes: [],
          allowedHeroes: [],
          allowedTagExpression: [],
          attributeRequirements: [],
          occupiedSlotCount: 0,
          viabilityContext: EMPTY_VIABILITY_CONTEXT,
          damageSourcePattern: pattern,
          scenarioWarnings: [],
        }],
      },
    }
  }

  function evalDps(collections: PlannerCollections, variant: Variant, placements: Record<string, string>): string {
    return evaluateFormation({
      collections, variant, profileSnapshot: null, placements,
      options: { candidateMode: 'all-hypothetical' },
    }).result?.objectiveValue ?? 'ERR'
  }

  it('adjacent: carry 邻接参考英雄 → 有效；不邻接 → SCORE_ZERO', () => {
    // ref=nayeli@s1(adj: s2,s4) → carry@jarlaxle at s2(adj) valid; s3(not adj) invalid
    const { collections, variant } = makePatternScenario({ kind: 'adjacent', referenceHeroId: 'nayeli' })
    const valid = evalDps(collections, variant, { s1: 'nayeli', s2: 'jarlaxle', s3: 'celeste', s4: 'bruenor' })
    const invalid = evalDps(collections, variant, { s1: 'nayeli', s3: 'jarlaxle', s2: 'celeste', s4: 'bruenor' })
    expect(valid).not.toBe('0')
    expect(invalid).toBe('0')
  })

  it('not-adjacent: carry 不邻接参考英雄 → 有效；邻接 → SCORE_ZERO', () => {
    // ref=nayeli@s1(adj: s2,s4) → carry@jarlaxle at s3(not adj) valid; s2(adj) invalid
    const { collections, variant } = makePatternScenario({ kind: 'not-adjacent', referenceHeroId: 'nayeli' })
    const valid = evalDps(collections, variant, { s1: 'nayeli', s3: 'jarlaxle', s2: 'celeste', s4: 'bruenor' })
    const invalid = evalDps(collections, variant, { s1: 'nayeli', s2: 'jarlaxle', s3: 'celeste', s4: 'bruenor' })
    expect(valid).not.toBe('0')
    expect(invalid).toBe('0')
  })

  it('front-columns: carry 在参考英雄前方列 → 有效；后方列 → SCORE_ZERO', () => {
    // ref=nayeli@s3(col3,span=1) → carry col∈[2,3] valid; col1 invalid
    const { collections, variant } = makePatternScenario({ kind: 'front-columns', referenceHeroId: 'nayeli', columnSpan: 1 })
    const valid = evalDps(collections, variant, { s3: 'nayeli', s2: 'jarlaxle', s1: 'celeste', s4: 'bruenor' })
    const invalid = evalDps(collections, variant, { s3: 'nayeli', s1: 'jarlaxle', s2: 'celeste', s4: 'bruenor' })
    expect(valid).not.toBe('0')
    expect(invalid).toBe('0')
  })

  it('behind-columns: carry 在参考英雄后方列 → 有效；前方列 → SCORE_ZERO', () => {
    // ref=nayeli@s1(col1,span=1) → carry col∈[1,2] valid; col3 invalid
    const { collections, variant } = makePatternScenario({ kind: 'behind-columns', referenceHeroId: 'nayeli', columnSpan: 1 })
    const valid = evalDps(collections, variant, { s1: 'nayeli', s2: 'jarlaxle', s3: 'celeste', s4: 'bruenor' })
    const invalid = evalDps(collections, variant, { s1: 'nayeli', s3: 'jarlaxle', s2: 'celeste', s4: 'bruenor' })
    expect(valid).not.toBe('0')
    expect(invalid).toBe('0')
  })
})

// attributeRequirements 过滤：不满足属性门槛的英雄被排除出候选池。
// 此前所有场景 attributeRequirements:[]，过滤路径从未被测试。
describe('attributeRequirements 候选过滤', () => {
  it('不满足 STR 13+ 的英雄被排除出推荐候选', () => {
    const attrVariant = createVariant('variant-attr', { campaign, name: text('Attr Gate', '属性门槛') })
    const heroesWithScores: HeroAbilityProfile[] = plannerHeroes.map((h) => {
      if (h.heroId === 'jarlaxle') return { ...h, abilityScores: { str: 10 } } // STR 10 < 13 → 被排除
      if (h.heroId === 'asharra') return { ...h, abilityScores: { str: 15 } } // STR 15 ≥ 13 → 通过
      return { ...h, abilityScores: { str: 14 } }
    })
    const attrCollections: PlannerCollections = {
      variants: [attrVariant],
      plannerHeroes: heroesWithScores,
      plannerScenarios: [{
        variantId: attrVariant.id,
        scenarioRef: { kind: 'variant', id: attrVariant.id },
        name: attrVariant.name,
        formationLayoutId: 'layout-attr',
        objectiveArea: attrVariant.objectiveArea,
        slotTopology: [
          { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
          { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
          { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2', 's4'] },
          { slotId: 's4', row: 1, column: 4, adjacentSlotIds: ['s3'] },
        ],
        forcedHeroes: [],
        enemyTypes: [],
        allowedHeroes: [],
        allowedTagExpression: [],
        attributeRequirements: [{ stat: 'str', operator: '>=', value: 13 }],
        occupiedSlotCount: 0,
        viabilityContext: EMPTY_VIABILITY_CONTEXT,
        damageSourcePattern: null,
        scenarioWarnings: [],
      }],
    }

    const recommendation = buildPlannerRecommendation({
      collections: attrCollections,
      variant: attrVariant,
      profileSnapshot: null,
      options: { candidateMode: 'all-hypothetical' },
    })

    // jarlaxle(STR 10) 被排除——不出现在任何推荐结果的 placements 中
    for (const result of recommendation.results) {
      const placedHeroes = Object.values(result.placements)
      expect(placedHeroes).not.toContain('jarlaxle')
    }
  })
})
