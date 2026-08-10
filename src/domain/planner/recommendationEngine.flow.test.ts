/**
 * planner 编排链流程流转集成测试（第五轮）。
 *
 * 守护 buildPlannerRecommendation 的动态流转：分支路径、参数穿透、
 * blocker 状态转换、用户锁往返、distinct-carry Top K 去重。
 *
 * 与前四轮正交：模块间动态协作（分支走对/参数穿透/状态转换/端到端往返），
 * 非单模块行为/静态契约/单点反例。
 *
 * 详见 docs/audits/integration-contract-audit.md §8（第五轮续章）。
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { unwrap } from '../../../tests/utils/dom-assertions'
import type { LocalizedOption, LocalizedText, Variant } from '../types'
import type { HeroAbilityProfile } from '../abilities/abilityModel'
import { createOwnedHero, createUserProfileSnapshot } from '../user-profile/fixtures'
import { type OfficialPlannerScenarioModel, EMPTY_VIABILITY_CONTEXT, resolvePlannerModel } from './plannerModel'
import { buildPlannerRecommendation } from './recommendationEngine'
import type { PlannerCollections } from './recommendationTypes'

// === 合成夹具（受控 blocker/状态/锁路径）===

function text(original: string, display = original): LocalizedText {
  return { original, display }
}

function option(id: string, original: string, display = original): LocalizedOption {
  return { id, original, display }
}

const campaign = option('campaign-a', 'Grand Tour', '剑湾之旅')

function buildVariant(id: string, overrides: Partial<Variant> = {}): Variant {
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
    allowedTagExpression: [],
    ...overrides,
  }
}

const carryByHero = new Map<string, HeroAbilityProfile['carrySignals']>([
  ['asharra', [{ kind: 'heroDpsMultiplier', value: 100, rawEffect: 'hero_dps_multiplier_mult,100', source: 'official-parsed' }]],
  ['jarlaxle', [{ kind: 'heroDpsMultiplier', value: 25, rawEffect: 'hero_dps_multiplier_mult,25', source: 'official-parsed' }]],
])
const supportByHero = new Map<string, HeroAbilityProfile['supportSignals']>([
  ['bruenor', [{ kind: 'globalDpsMultiplier', value: 100, rawEffect: 'global_dps_multiplier_mult,100', source: 'official-parsed' }]],
  ['celeste', [{ kind: 'globalDpsMultiplier', value: 50, rawEffect: 'global_dps_multiplier_mult,50', source: 'official-parsed' }]],
])

const heroIds = ['bruenor', 'asharra', 'celeste', 'nayeli', 'jarlaxle']
const synthHeroes: HeroAbilityProfile[] = heroIds.map((id, i) => ({
  heroId: id,
  name: text(id, id),
  seat: i + 1,
  roles: ['dps'],
  tags: [],
  baseAttackDamageTypes: [],
  baseAttackCooldown: null,
  age: null,
  abilityScores: {},
  baseDamage: 1,
  baseHealth: 1,
  carrySignals: carryByHero.get(id) ?? [],
  supportSignals: supportByHero.get(id) ?? [],
  unsupportedSignals: [],
  sourceBreakdown: { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
}))

const standardTopology = [
  { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
  { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
  { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2', 's4'] },
  { slotId: 's4', row: 1, column: 4, adjacentSlotIds: ['s3'] },
]

function buildScenario(variantId: string, overrides: Partial<OfficialPlannerScenarioModel> = {}): OfficialPlannerScenarioModel {
  return {
    variantId,
    scenarioRef: { kind: 'variant', id: variantId },
    name: text(variantId, variantId),
    formationLayoutId: `layout-${variantId}`,
    objectiveArea: 100,
    slotTopology: standardTopology,
    forcedHeroes: [],
    scenarioWarnings: [],
    enemyTypes: [],
    allowedHeroes: [],
    allowedTagExpression: [],
    attributeRequirements: [],
    occupiedSlotCount: 0,
    viabilityContext: EMPTY_VIABILITY_CONTEXT,
    damageSourcePattern: null,
    ...overrides,
  }
}

function synthCollections(scenarios: OfficialPlannerScenarioModel[], heroes: HeroAbilityProfile[] = synthHeroes): PlannerCollections {
  return {
    variants: scenarios.map((s) => buildVariant(s.variantId)),
    plannerHeroes: heroes,
    plannerScenarios: scenarios,
  }
}

const flowScenario = buildScenario('v-flow')
const flowVariant = buildVariant('v-flow')
const flowCols = synthCollections([flowScenario])

function fullSnapshot() {
  return createUserProfileSnapshot({
    ownedHeroes: heroIds.map((id) => createOwnedHero({ heroId: id, level: 500 })),
  })
}

// === 真实数据加载（参数矩阵 / Top K / 确定性）===

const DATA_DIR = path.resolve('public/data/v1')

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8'))
}

interface DataCollection<T> { items: T[]; updatedAt: string }

const heroesRaw = loadJson('hero-abilities') as DataCollection<HeroAbilityProfile>
const scenariosRaw = loadJson('scenarios') as DataCollection<OfficialPlannerScenarioModel>
const variantsRaw = loadJson('variants') as DataCollection<Variant>
const resolved = resolvePlannerModel(heroesRaw.items, scenariosRaw.items, [], [])
const realHeroes = resolved.heroes
const realScenarios = resolved.scenarios
const realVariants = variantsRaw.items
const realVariantById = new Map(realVariants.map((v) => [v.id, v]))

/** 选一个 >=4 槽、无 forced、无白名单的 scenario 作参数矩阵基线。 */
const realBaseline = unwrap(
  realScenarios.find((s) => s.slotTopology.length >= 4 && s.forcedHeroes.length === 0 && s.allowedHeroes.length === 0),
  'test data 缺少 >=4 槽 plain scenario',
)
const realBaselineVariant = unwrap(realVariantById.get(realBaseline.variantId), '缺 variant')
const realCollections: PlannerCollections = {
  variants: realVariants,
  plannerHeroes: realHeroes,
  plannerScenarios: realScenarios,
}

// === 落点1: 编排分支路径覆盖 ===

describe('落点1: 编排分支路径覆盖', () => {
  it('variant=null → blocker=null、scenarioRef=null（无输入路径）', () => {
    const rec = buildPlannerRecommendation({
      collections: flowCols,
      variant: null,
      profileSnapshot: fullSnapshot(),
    })
    expect(rec.blocker).toBeNull()
    expect(rec.scenarioRef).toBeNull()
    expect(rec.result).toBeNull()
    expect(rec.results).toHaveLength(0)
    expect(rec.layoutId).toBeNull()
    expect(rec.slots).toHaveLength(0)
  })

  it('plannerHeroes=[] → blocker=null、scenarioRef=null（空英雄池路径）', () => {
    const emptyCols: PlannerCollections = { variants: [flowVariant], plannerHeroes: [], plannerScenarios: [flowScenario] }
    const rec = buildPlannerRecommendation({
      collections: emptyCols,
      variant: flowVariant,
      profileSnapshot: fullSnapshot(),
    })
    expect(rec.blocker).toBeNull()
    expect(rec.scenarioRef).toBeNull()
    expect(rec.result).toBeNull()
  })

  it('variant 无匹配 scenario → blocker=missing-formation', () => {
    const orphanVariant = buildVariant('v-no-scenario')
    const rec = buildPlannerRecommendation({
      collections: flowCols,
      variant: orphanVariant,
      profileSnapshot: null,
      options: { candidateMode: 'all-hypothetical' },
    })
    expect(rec.blocker).toBe('missing-formation')
    expect(rec.scenarioRef).toEqual({ kind: 'variant', id: 'v-no-scenario' })
    expect(rec.result).toBeNull()
    expect(rec.layoutId).toBeNull()
  })

  it('scenario formationLayoutId=null → blocker=missing-formation', () => {
    const nullLayoutScenario = buildScenario('v-null-layout', { formationLayoutId: null })
    const cols = synthCollections([nullLayoutScenario])
    const rec = buildPlannerRecommendation({
      collections: cols,
      variant: buildVariant('v-null-layout'),
      profileSnapshot: null,
      options: { candidateMode: 'all-hypothetical' },
    })
    expect(rec.blocker).toBe('missing-formation')
    expect(rec.result).toBeNull()
  })

  it('blocker 优先级：owned-only 无 profile 且无匹配 scenario → missing-profile 优先于 missing-formation', () => {
    // 同时满足 missing-profile（owned-only 无快照）和 missing-formation（variant 无匹配 scenario），
    // resolvePlannerScenario 先检查 profile → 返回 missing-profile。
    const orphanVariant = buildVariant('v-priority')
    const rec = buildPlannerRecommendation({
      collections: flowCols,
      variant: orphanVariant,
      profileSnapshot: null,
      // 默认 owned-only，无 profile
    })
    expect(rec.blocker).toBe('missing-profile')
    expect(rec.scenarioRef).toEqual({ kind: 'variant', id: 'v-priority' })
  })

  it('确定性：相同输入两次调用 → 相同 blocker/carryHeroId/objectiveValue/results.length', () => {
    const opts = { candidateMode: 'all-hypothetical' as const }
    const a = buildPlannerRecommendation({ collections: flowCols, variant: flowVariant, profileSnapshot: null, options: opts })
    const b = buildPlannerRecommendation({ collections: flowCols, variant: flowVariant, profileSnapshot: null, options: opts })
    expect(a.blocker).toBe(b.blocker)
    expect(a.result?.carryHeroId).toBe(b.result?.carryHeroId)
    expect(a.result?.objectiveValue).toBe(b.result?.objectiveValue)
    expect(a.results.length).toBe(b.results.length)
  })
})

// === 落点2: 参数穿透数据流 ===

describe('落点2: 参数穿透决策表', () => {
  const baseOpts = { candidateMode: 'all-hypothetical' as const }

  it('scoringMode: carry-dps 与 team-gold 产生不同 objectiveValue（不同优化目标穿透）', () => {
    const carry = buildPlannerRecommendation({
      collections: realCollections,
      variant: realBaselineVariant,
      profileSnapshot: null,
      options: { ...baseOpts, computationMode: 'full', scoringMode: 'carry-dps' },
    })
    const gold = buildPlannerRecommendation({
      collections: realCollections,
      variant: realBaselineVariant,
      profileSnapshot: null,
      options: { ...baseOpts, computationMode: 'full', scoringMode: 'team-gold' },
    })
    expect(carry.blocker).toBeNull()
    expect(gold.blocker).toBeNull()
    // 不同优化目标 → 不同 objectiveValue（carry-dps 优化单英雄 DPS，team-gold 优化全队金币）
    expect(carry.result?.objectiveValue).not.toBe(gold.result?.objectiveValue)
    // carry-dps 有 areaEstimate（BUD 估算），team-gold 可能无（无 carry 概念）
    expect(carry.result?.areaEstimate).not.toBeNull()
  }, 30000)

  it('computationMode: full 与 p50 产生可观测差异（候选裁剪穿透到评估层）', () => {
    const full = buildPlannerRecommendation({
      collections: realCollections,
      variant: realBaselineVariant,
      profileSnapshot: null,
      options: { ...baseOpts, computationMode: 'full' },
    })
    const p50 = buildPlannerRecommendation({
      collections: realCollections,
      variant: realBaselineVariant,
      profileSnapshot: null,
      options: { ...baseOpts, computationMode: 'p50' },
    })
    expect(full.blocker).toBeNull()
    expect(p50.blocker).toBeNull()
    // p50 按 seat 分组裁剪 50% → 候选池不同 → 至少一项可观测差异
    const objDiff = full.result?.objectiveValue !== p50.result?.objectiveValue
    const carryDiff = full.result?.carryHeroId !== p50.result?.carryHeroId
    const lenDiff = full.results.length !== p50.results.length
    expect(objDiff || carryDiff || lenDiff, 'computationMode full vs p50 应产生可观测差异（100+ 英雄裁剪 50%）').toBe(true)
  }, 30000)

  it.each([
    { projection: 'absolute-dps' as const, expectAreaNotNull: true, desc: '含 baseDamage/levelCurve，areaEstimate 非空' },
    { projection: 'formation-buff' as const, expectAreaNotNull: false, desc: '仅阵型聚合，areaEstimate=null' },
  ])('aggregateProjection=$projection → $desc', ({ projection, expectAreaNotNull }) => {
    const rec = buildPlannerRecommendation({
      collections: realCollections,
      variant: realBaselineVariant,
      profileSnapshot: null,
      options: { ...baseOpts, computationMode: 'full', aggregateProjection: projection },
    })
    expect(rec.blocker).toBeNull()
    expect(rec.result).not.toBeNull()
    expect(rec.result?.areaEstimate != null).toBe(expectAreaNotNull)
  }, 30000)

  it('aggregateProjection: absolute-dps 与 formation-buff 量级不同（可观测差异）', () => {
    const absolute = buildPlannerRecommendation({
      collections: realCollections,
      variant: realBaselineVariant,
      profileSnapshot: null,
      options: { ...baseOpts, computationMode: 'full', aggregateProjection: 'absolute-dps' },
    })
    const formationBuff = buildPlannerRecommendation({
      collections: realCollections,
      variant: realBaselineVariant,
      profileSnapshot: null,
      options: { ...baseOpts, computationMode: 'full', aggregateProjection: 'formation-buff' },
    })
    // absolute-dps 含 baseDamage × levelCurve（真实英雄 baseDamage >> 1）→ 量级远大于 formation-buff
    const absLog10 = Math.log10(Number(absolute.result?.objectiveValue ?? '0'))
    const fbLog10 = Math.log10(Number(formationBuff.result?.objectiveValue ?? '0'))
    expect(absLog10).toBeGreaterThan(fbLog10)
  }, 30000)
})

// === 落点3: blocker 状态转换 ===

describe('落点3: blocker 状态转换（模式切换）', () => {
  it('owned-only insufficient-owned-heroes → all-hypothetical 正常（blocker 消失）', () => {
    // 只拥有 1 个英雄，4 槽阵型 → owned-only 不足
    const slimSnapshot = createUserProfileSnapshot({
      ownedHeroes: [createOwnedHero({ heroId: 'bruenor', level: 500 })],
    })

    const owned = buildPlannerRecommendation({
      collections: flowCols,
      variant: flowVariant,
      profileSnapshot: slimSnapshot,
    })
    expect(owned.blocker).toBe('insufficient-owned-heroes')
    expect(owned.result).toBeNull()

    // 切换到 all-hypothetical → 候选扩展到全部英雄 → blocker 消失
    const hypo = buildPlannerRecommendation({
      collections: flowCols,
      variant: flowVariant,
      profileSnapshot: slimSnapshot,
      options: { candidateMode: 'all-hypothetical' },
    })
    expect(hypo.blocker).toBeNull()
    expect(hypo.results.length).toBeGreaterThan(0)
  })
})

// === 落点4: 用户锁端到端往返 ===

describe('落点4: 用户锁端到端往返', () => {
  const opts = { candidateMode: 'all-hypothetical' as const }

  it('lockedSlots → 结果含锁定槽位（slotId→heroId 保持不变）', () => {
    const rec = buildPlannerRecommendation({
      collections: flowCols,
      variant: flowVariant,
      profileSnapshot: null,
      options: { ...opts, lockedSlots: { s1: 'bruenor' } },
    })
    expect(rec.blocker).toBeNull()
    expect(rec.result).not.toBeNull()
    // beamSearch 保留 lockedPlacements → 结果含锁定位
    expect(rec.result?.placements.s1).toBe('bruenor')
    // placementEntries 也含锁定位
    expect(rec.result?.placementEntries?.some((e) => e.slotId === 's1' && e.heroId === 'bruenor')).toBe(true)
  })

  it('lockedCarryHeroId → result.carryHeroId 与之一致（强制 carry 穿透到评分层）', () => {
    const rec = buildPlannerRecommendation({
      collections: flowCols,
      variant: flowVariant,
      profileSnapshot: null,
      options: { ...opts, lockedCarryHeroId: 'asharra' },
    })
    expect(rec.blocker).toBeNull()
    expect(rec.result).not.toBeNull()
    expect(rec.result?.carryHeroId).toBe('asharra')
    // Top K 中每个结果的 carryHeroId 也应是 asharra（lockedCarryHeroId 全局穿透）
    for (const result of rec.results) {
      expect(result.carryHeroId).toBe('asharra')
    }
  })
})

// === 落点6: distinct-carry Top K 去重集成 ===

describe('落点6: distinct-carry Top K 去重集成', () => {
  const opts = { candidateMode: 'all-hypothetical' as const, computationMode: 'full' as const }

  it('results.length <= 3（PLANNER_TOP_K 截断）', () => {
    const rec = buildPlannerRecommendation({
      collections: realCollections,
      variant: realBaselineVariant,
      profileSnapshot: null,
      options: opts,
    })
    expect(rec.blocker).toBeNull()
    // selectTopKByCarry 截断到 PLANNER_TOP_K=3
    expect(rec.results.length).toBeLessThanOrEqual(3)
  }, 30000)

  it('结果中 carryHeroId 互异（distinct-carry 去重生效）', () => {
    const rec = buildPlannerRecommendation({
      collections: realCollections,
      variant: realBaselineVariant,
      profileSnapshot: null,
      options: opts,
    })
    expect(rec.blocker).toBeNull()
    expect(rec.results.length).toBeGreaterThan(0)
    const carryIds = rec.results.map((r) => r.carryHeroId)
    // selectTopKByCarry 按 carryHeroId 去重 → 每个 carry 只出现一次
    expect(new Set(carryIds).size).toBe(carryIds.length)
    // 结果按 objectiveValue 降序
    const values = rec.results.map((r) => Math.log10(Number(r.objectiveValue)))
    for (let i = 1; i < values.length; i++) {
      expect(unwrap(values[i - 1], '缺 value')).toBeGreaterThanOrEqual(unwrap(values[i], '缺 value'))
    }
  }, 30000)
})
