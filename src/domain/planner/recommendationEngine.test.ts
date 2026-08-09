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
      viabilityContext: { armor: { segments: 200 }, hitsBased: null, damageModifier: null, enemyDamageMult: null },
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
  })
})
