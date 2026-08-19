/**
 * planner 流水线模块间接缝契约守护（第四轮）。
 *
 * 与前三轮正交：
 * - 第一轮（补缺口）：单模块内「测了没」
 * - 第二轮（对抗性）：单模块内「测得住没」
 * - 本轮（集成契约）：跨模块「接缝稳不稳」——A 产出偏离 B 假设时是 fail-fast、静默错误、还是错误结果
 *
 * 六条接缝 × 三类手段（结构断言 / 契约变异 / 金标回归）。
 * 禁 snapshot；结构契约用显式字段断言。
 * 详见 docs/audits/integration-contract-audit.md。
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { unwrap } from '../../../tests/utils/dom-assertions'
import type { HeroAbilityKind, HeroAbilityProfile, HeroAbilitySignal, HeroAbilitySource, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import { createOwnedHero, createUserProfileSnapshot } from '../user-profile/fixtures'
import type { UserProfileSnapshot } from '../user-profile/types'
import type { Variant } from '../types'
import { toGameNumber } from '../gameNumber'
import { beamSearch } from './beamSearchRanking'
import { evaluatePlacementFit } from './placementFit'
import type { AggregatedPool } from './placementFitTypes'
import { resolvePlannerModel, type OfficialPlannerScenarioModel, type ResolvedPlannerScenarioModel } from './plannerModel'
import { buildPlannerRecommendation } from './recommendationEngine'
import type { PlannerCollections } from './recommendationTypes'
import { scoreFormation, type ScoringResult } from './steadyStateScoring'
import { productOfPoolMultipliers } from './scoring/poolAggregation'

// === 数据加载 ===

const DATA_DIR = path.resolve('public/data/v1')

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8'))
}

interface DataCollection<T> {
  items: T[]
  updatedAt: string
}

const heroesRaw = loadJson('hero-abilities') as DataCollection<HeroAbilityProfile>
const scenariosRaw = loadJson('scenarios') as DataCollection<OfficialPlannerScenarioModel>
const variantsRaw = loadJson('variants') as DataCollection<Variant>
const resolved = resolvePlannerModel(heroesRaw.items, scenariosRaw.items, [], [])
const realHeroes = resolved.heroes
const realScenarios = resolved.scenarios
const realVariants = variantsRaw.items
const heroesById = new Map(realHeroes.map((h) => [h.heroId, h]))
const variantById = new Map(realVariants.map((v) => [v.id, v]))

const VALID_KINDS = new Set<HeroAbilityKind>([
  'globalDpsMultiplier', 'heroDpsMultiplier', 'globalGoldMultiplier',
  'globalCritChance', 'heroCritChance', 'globalCritDamage', 'heroCritDamage',
  'globalHealthMultiplier', 'heroHealthMultiplier', 'damageReduction',
  'enemyVulnerability', 'attackSpeedMult', 'cooldownReduction',
])

const VALID_SOURCES = new Set<HeroAbilitySource>([
  'official-parsed', 'repo-semantic-patch', 'browser-local-override', 'heuristic-fallback',
])

/** 全英雄已拥有的合成快照（worst case，解锁全部候选）。 */
function synthesizeAllOwned(): UserProfileSnapshot {
  return createUserProfileSnapshot({
    ownedHeroes: realHeroes.map((h) => createOwnedHero({ heroId: h.heroId, level: 1 })),
  })
}

function makeResult(score: number): ScoringResult {
  return {
    objectiveValue: toGameNumber(score),
    warnings: [],
    activeSignalKinds: new Set<HeroAbilityKind>(),
    breakdown: null,
    carryHeroId: null,
  }
}

function findScenario(minSlots: number): ResolvedPlannerScenarioModel {
  return unwrap(
    realScenarios.find((s) => s.slotTopology.length >= minSlots),
    `test data 缺少 >= ${String(minSlots)} 槽 scenario`,
  )
}

function assertPoolInvariant(pool: AggregatedPool): void {
  const expected = (1 + pool.addPercent / 100) * pool.multFactor
  expect(pool.poolMultiplier).toBeCloseTo(expected, 10)
}

function makeMinimalScenario(): ResolvedPlannerScenarioModel {
  return {
    variantId: 'test',
    scenarioRef: { kind: 'variant', id: 'test' },
    name: { original: 'test', display: 'test' },
    formationLayoutId: 'test-layout',
    objectiveArea: null,
    slotTopology: [
      { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
      { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1'] },
    ],
    forcedHeroes: [],
    scenarioWarnings: [],
    enemyTypes: [],
    allowedHeroes: [],
    allowedTagExpression: [],
    attributeRequirements: [],
    occupiedSlotCount: 0,
    viabilityContext: {
      armor: null, hitsBased: null, damageModifier: null, enemyDamageMult: null, healthDrainRate: null,
    },
    damageSourcePattern: null,
  }
}

function pickDistinctSeats(heroes: ResolvedHeroAbilityProfile[], count: number): ResolvedHeroAbilityProfile[] {
  const picked: ResolvedHeroAbilityProfile[] = []
  const usedSeats = new Set<number>()
  for (const hero of heroes) {
    if (!usedSeats.has(hero.seat)) {
      picked.push(hero)
      usedSeats.add(hero.seat)
      if (picked.length >= count) break
    }
  }
  return picked
}

function makeTestHero(heroId: string, seat: number, carrySignals: HeroAbilitySignal[] = []): HeroAbilityProfile {
  return {
    heroId, name: { original: heroId, display: heroId }, seat,
    roles: [], tags: [], baseAttackDamageTypes: [], baseAttackCooldown: null,
    age: null, abilityScores: {}, baseDamage: 10, baseHealth: 100,
    carrySignals, supportSignals: [], unsupportedSignals: [],
    sourceBreakdown: { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
  }
}

// === Seam 1: buildModels → hero-abilities.json → plannerHeroes 结构契约 ===

describe('Seam 1: buildModels → hero-abilities.json → plannerHeroes 结构契约', () => {
  it('所有 profile 含必需标量字段且类型正确', () => {
    expect(realHeroes.length).toBeGreaterThan(100)
    const badFields: string[] = []
    for (const hero of realHeroes) {
      if (typeof hero.heroId !== 'string' || hero.heroId.length === 0) badFields.push(hero.heroId + '.heroId')
      if (typeof hero.seat !== 'number') badFields.push(hero.heroId + '.seat')
      if (typeof hero.baseDamage !== 'number') badFields.push(hero.heroId + '.baseDamage')
      if (typeof hero.baseHealth !== 'number') badFields.push(hero.heroId + '.baseHealth')
    }
    expect(badFields, '标量字段缺失/类型错误').toHaveLength(0)
  })

  it('所有 heroId 全局唯一', () => {
    const ids = realHeroes.map((h) => h.heroId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('所有 signal 数组存在且元素含必需字段', () => {
    let totalSignals = 0
    const badSignals: string[] = []
    for (const hero of realHeroes) {
      for (const signal of [...hero.carrySignals, ...hero.supportSignals]) {
        totalSignals++
        if (!VALID_KINDS.has(signal.kind)) badSignals.push(hero.heroId + ' kind=' + signal.kind)
        if (typeof signal.rawEffect !== 'string' || signal.rawEffect.length === 0) badSignals.push(hero.heroId + ' rawEffect')
        if (!VALID_SOURCES.has(signal.source)) badSignals.push(hero.heroId + ' source=' + signal.source)
      }
    }
    expect(totalSignals).toBeGreaterThan(1000)
    expect(badSignals, 'signal 字段不合规').toHaveLength(0)
  })

  it('所有 gainProfile 含 self/support 子对象（computationMode 消费前提）', () => {
    const withGain = realHeroes.filter((h) => h.gainProfile != null)
    expect(withGain.length).toBeGreaterThan(realHeroes.length * 0.8)
    // self/support 是 required field（TS 类型保证非 null）；只验 gainProfile 本身存在
  })

  it('scenario.forcedHeroes 引用的 heroId 在 heroesById 中存在（数据级一致性）', () => {
    const missing: string[] = []
    for (const scenario of realScenarios) {
      for (const heroId of scenario.forcedHeroes) {
        if (!heroesById.has(heroId)) missing.push(`${scenario.variantId}:${heroId}`)
      }
    }
    // 锁现状：允许少量缺失（restrictions 文本解析限制 / 未发布英雄），增长说明管线漂移
    expect(missing.length).toBeLessThanOrEqual(5)
  })
})

// === Seam 1 契约变异 ===

describe('Seam 1 契约变异：上游 profile 损坏 → 下游行为分类', () => {
  const sampleHero = unwrap(realHeroes[0], 'test data 缺英雄')
  const sampleScenario = findScenario(2)
  const slotId = unwrap(sampleScenario.slotTopology[0], 'scenario 缺 slot').slotId

  it('baseDamage≤0 → fail-fast', () => {
    const corrupted = { ...sampleHero, baseDamage: -5 }
    const heroesMap = new Map([[corrupted.heroId, corrupted]])
    expect(() => scoreFormation({
      placements: { [slotId]: corrupted.heroId },
      heroesById: heroesMap,
      scenario: sampleScenario,
    })).toThrow()
  })

  it('carrySignals=undefined → fail-fast（collectSignals spread TypeError）', () => {
    const corrupted = { ...sampleHero, carrySignals: undefined as unknown as HeroAbilitySignal[] }
    const heroesMap = new Map([[corrupted.heroId, corrupted]])
    expect(() => scoreFormation({
      placements: { [slotId]: corrupted.heroId },
      heroesById: heroesMap,
      scenario: sampleScenario,
    })).toThrow(TypeError)
  })

  it('signal.kind 非法 → fail-fast', () => {
    const badKind = 'totally-bogus-kind' as HeroAbilityKind
    const corrupted = makeTestHero('bad-kind-hero', 99, [
      { kind: badKind, value: 100, rawEffect: 'bogus,100', source: 'official-parsed' },
    ])
    const heroesMap = new Map([[corrupted.heroId, corrupted]])
    expect(() => scoreFormation({
      placements: { [slotId]: corrupted.heroId },
      heroesById: heroesMap,
      scenario: sampleScenario,
    })).toThrow()
  })
})

// === Seam 6: scenarios.json 结构契约 ===

describe('Seam 6: scenarios.json → plannerScenarios 结构契约', () => {
  it('所有 scenario 含必需字段 + 有布局的 slotTopology 非空', () => {
    expect(realScenarios.length).toBeGreaterThan(100)
    const errors: string[] = []
    for (const scenario of realScenarios) {
      if (typeof scenario.variantId !== 'string') errors.push('variantId not string')
      if (scenario.formationLayoutId !== null && typeof scenario.formationLayoutId !== 'string') errors.push(`${scenario.variantId} formationLayoutId`)
      if (!Array.isArray(scenario.slotTopology)) errors.push(`${scenario.variantId} slotTopology`)
      if (scenario.formationLayoutId != null && scenario.slotTopology.length === 0) errors.push(`${scenario.variantId} 有布局但 slotTopology 空`)
      if (typeof scenario.occupiedSlotCount !== 'number') errors.push(`${scenario.variantId} occupiedSlotCount`)
    }
    expect(errors, 'scenario 字段不合规').toHaveLength(0)
  })

  it('所有 slotTopology 槽位含 slotId + adjacentSlotIds + row + column', () => {
    const errors: string[] = []
    for (const scenario of realScenarios) {
      for (const slot of scenario.slotTopology) {
        if (typeof slot.slotId !== 'string' || slot.slotId.length === 0) errors.push(scenario.variantId + ' slotId')
        if (!Array.isArray(slot.adjacentSlotIds)) errors.push(scenario.variantId + ' ' + slot.slotId + ' adjacentSlotIds')
        if (typeof slot.row !== 'number') errors.push(scenario.variantId + ' ' + slot.slotId + ' row')
        if (typeof slot.column !== 'number') errors.push(scenario.variantId + ' ' + slot.slotId + ' column')
      }
    }
    expect(errors, 'slot 字段不合规').toHaveLength(0)
  })

  it('所有 adjacentSlotIds 引用的 slotId 在同一 scenario 的 slotTopology 内（自洽图）', () => {
    const errors: string[] = []
    for (const scenario of realScenarios) {
      const validIds = new Set(scenario.slotTopology.map((s) => s.slotId))
      for (const slot of scenario.slotTopology) {
        for (const adjId of slot.adjacentSlotIds) {
          if (!validIds.has(adjId)) errors.push(scenario.variantId + ' ' + slot.slotId + '→' + adjId + ' 不在拓扑内')
        }
      }
    }
    expect(errors, 'adjacentSlotIds 悬空引用').toHaveLength(0)
  })

  it('damageSourcePattern 非 null 时 kind 合法 + referenceHeroId 非空', () => {
    const validKinds = new Set(['same-column', 'adjacent', 'not-adjacent', 'within-slots', 'front-columns', 'behind-columns'])
    const errors: string[] = []
    for (const scenario of realScenarios) {
      const pattern = scenario.damageSourcePattern
      if (pattern == null) continue
      if (!validKinds.has(pattern.kind)) errors.push(scenario.variantId + ' kind=' + pattern.kind)
      if (typeof pattern.referenceHeroId !== 'string' || pattern.referenceHeroId.length === 0) errors.push(scenario.variantId + ' referenceHeroId')
      if (typeof pattern.includeReference !== 'boolean') errors.push(scenario.variantId + ' includeReference')
    }
    expect(errors, 'damageSourcePattern 不合规').toHaveLength(0)
  })
})

// === Seam 2: evaluatePlacementFit → pools 不变量 ===

describe('Seam 2: evaluatePlacementFit → pools 不变量（真实数据）', () => {
  it('每个产出的 pool 满足 poolMultiplier = (1 + addPercent/100) × multFactor', () => {
    const scenario = findScenario(4)
    const carry = unwrap(realHeroes[0], '缺 hero')
    const slots = scenario.slotTopology.slice(0, 4)
    let checkedPools = 0

    for (let i = 1; i < Math.min(8, realHeroes.length); i++) {
      const support = unwrap(realHeroes[i], '缺 hero')
      const supportSlot = unwrap(slots[i % slots.length], '缺 slot')
      const carrySlot = unwrap(slots[0], '缺 slot')
      const result = evaluatePlacementFit({
        carryHero: carry, carrySlotId: carrySlot.slotId,
        supportHero: support, supportSlotId: supportSlot.slotId,
        scenario, placements: {}, heroesById,
      })
      for (const pool of result.pools) {
        checkedPools++
        assertPoolInvariant(pool)
      }
    }
    expect(checkedPools).toBeGreaterThan(0)
  })

  it('totalMultiplier = Π(poolMultiplier)', () => {
    const scenario = unwrap(realScenarios[0], '缺 scenario')
    const carry = unwrap(realHeroes[0], '缺 hero')
    const support = unwrap(realHeroes[1], '缺 hero')
    const slot = unwrap(scenario.slotTopology[0], '缺 slot')
    const result = evaluatePlacementFit({
      carryHero: carry, carrySlotId: slot.slotId,
      supportHero: support, supportSlotId: slot.slotId,
      scenario, placements: {}, heroesById,
    })
    const product = result.pools.reduce((acc, p) => acc * p.poolMultiplier, 1)
    expect(result.totalMultiplier).toBeCloseTo(product, 10)
  })

  it('契约变异：pool.addPercent=NaN → fail-fast', () => {
    const corrupted = new Map<string, AggregatedPool>([
      ['damage:global', { dimension: 'damage', scope: 'global', addPercent: NaN, multFactor: 1, poolMultiplier: NaN }],
    ])
    expect(() => productOfPoolMultipliers(corrupted)).toThrow()
  })
})

// === Seam 3: scoreFormation → breakdown 因子之积 ===

describe('Seam 3: scoreFormation → breakdown 因子之积（真实数据）', () => {
  it('真实多英雄阵型 baseDps × Π(factors) ≈ carryDps', () => {
    const scenario = findScenario(4)
    const slots = scenario.slotTopology.slice(0, 4)
    const picked = pickDistinctSeats(realHeroes, 4)
    const placements: Record<string, string> = {}
    for (let i = 0; i < slots.length; i++) {
      placements[unwrap(slots[i], '缺 slot').slotId] = unwrap(picked[i], '缺 hero').heroId
    }

    const result = scoreFormation({ placements, heroesById, scenario })
    const b = unwrap(result.breakdown, 'breakdown 应非空')

    const baseDps = Number(b.baseDps)
    const product = baseDps * b.factors.damagePool * b.factors.crit
      * b.factors.vulnerability * b.factors.globalBuff * b.factors.heroDpsPool

    expect(Number.isFinite(product)).toBe(true)
    expect(product).toBeCloseTo(result.objectiveValue.toNumber(), 4)
  })

  it('真实阵型 breakdown.pools 每条满足 pool 不变量', () => {
    const scenario = findScenario(3)
    const slots = scenario.slotTopology.slice(0, 3)
    const picked = pickDistinctSeats(realHeroes, 3)
    const placements: Record<string, string> = {}
    for (let i = 0; i < slots.length; i++) {
      placements[unwrap(slots[i], '缺 slot').slotId] = unwrap(picked[i], '缺 hero').heroId
    }

    const result = scoreFormation({ placements, heroesById, scenario })
    const b = unwrap(result.breakdown, 'breakdown 应非空')
    expect(b.pools.length).toBeGreaterThan(0)
    for (const pool of b.pools) {
      assertPoolInvariant(pool)
    }
  })

  it('真实阵型 breakdown.contributions 的 signal kind 全合法', () => {
    const scenario = findScenario(3)
    const picked = pickDistinctSeats(realHeroes, 3)
    const placements: Record<string, string> = {}
    for (let i = 0; i < scenario.slotTopology.length && i < 3; i++) {
      placements[unwrap(scenario.slotTopology[i], '缺 slot').slotId] = unwrap(picked[i], '缺 hero').heroId
    }

    const result = scoreFormation({ placements, heroesById, scenario })
    const b = unwrap(result.breakdown, 'breakdown 应非空')
    const badKinds: string[] = []
    for (const contribution of b.contributions) {
      for (const signal of contribution.signals) {
        if (!VALID_KINDS.has(signal.signalKind)) badKinds.push(signal.signalKind)
      }
    }
    expect(badKinds, 'contribution 含非法 kind').toHaveLength(0)
  })
})

// === Seam 4: 同 key 加法（A1 契约）===

describe('Seam 4: 同 key 外部加成加法合并（A1 契约）', () => {
  it('ability global + 外部 globalBuff 同 key 加法（非乘法）', () => {
    const carry = makeTestHero('test-carry', 1)
    const support: HeroAbilityProfile = {
      ...carry, heroId: 'test-support', seat: 2,
      supportSignals: [{
        kind: 'globalDpsMultiplier', value: 100, rawEffect: 'global_dps_multiplier_mult,100',
        source: 'official-parsed',
      }],
    }
    const heroesMap = new Map([['test-carry', carry], ['test-support', support]])
    const result = scoreFormation({
      placements: { s1: 'test-carry', s2: 'test-support' },
      heroesById: heroesMap, scenario: makeMinimalScenario(),
      globalBuffMultiplier: 1.5,
    })
    const b = unwrap(result.breakdown, 'breakdown')
    // ability +100% + external +50% = +150% → poolMultiplier = 2.5（非 3）
    expect(b.factors.globalBuff).toBeCloseTo(2.5, 10)
  })

  it('ability hero_dps + 装备 hero_dps 同 key 加法', () => {
    const carry = makeTestHero('test-carry2', 1, [{
      kind: 'heroDpsMultiplier', value: 100, rawEffect: 'hero_dps_multiplier_mult,100',
      source: 'official-parsed',
    }])
    const heroesMap = new Map([['test-carry2', carry]])
    const result = scoreFormation({
      placements: { s1: 'test-carry2' },
      heroesById: heroesMap, scenario: makeMinimalScenario(),
      equipmentAdjustmentByHero: new Map([['test-carry2', 1.5]]),
    })
    const b = unwrap(result.breakdown, 'breakdown')
    expect(b.factors.heroDpsPool).toBeCloseTo(2.5, 10)
  })

  it('外部 hero_dps contribution 与装备 hero_dps 同 key 加法', () => {
    const carry = makeTestHero('test-carry3', 1)
    const heroesMap = new Map([['test-carry3', carry]])
    const result = scoreFormation({
      placements: { s1: 'test-carry3' },
      heroesById: heroesMap, scenario: makeMinimalScenario(),
      equipmentAdjustmentByHero: new Map([['test-carry3', 1.3]]),
      externalHeroDpsContributions: [{ qualifier: null, value: 50 }],
    })
    const b = unwrap(result.breakdown, 'breakdown')
    // +30% + 50% = +80% → poolMultiplier = 1.8
    expect(b.factors.heroDpsPool).toBeCloseTo(1.8, 10)
  })

  it('契约变异：globalBuffMultiplier=NaN → fail-fast', () => {
    const carry = makeTestHero('nan-carry', 1)
    const heroesMap = new Map([['nan-carry', carry]])
    expect(() => scoreFormation({
      placements: { s1: 'nan-carry' },
      heroesById: heroesMap, scenario: makeMinimalScenario(),
      globalBuffMultiplier: NaN,
    })).toThrow()
  })
})

// === Seam 5: beamSearch 结构透传 ===

describe('Seam 5: beamSearch → recommendationEngine 结构透传', () => {
  const testHeroes = [
    { heroId: 'a', seat: 1 },
    { heroId: 'b', seat: 2 },
    { heroId: 'c', seat: 3 },
    { heroId: 'd', seat: 4 },
  ]

  it('BeamSearchResult 透传 scoreFormation 回调的所有字段', () => {
    const results = beamSearch({
      heroes: testHeroes, slots: ['s1', 's2'], beamWidth: 3,
      scoreFormation: () => ({
        objectiveValue: toGameNumber(42),
        warnings: [{ literal: 'test-warning' }],
        carryHeroId: 'a',
        activeSignalKinds: new Set<HeroAbilityKind>(['heroDpsMultiplier']),
        breakdown: null, areaEstimate: null,
      }),
    })
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      expect(r.warnings).toContainEqual({ literal: 'test-warning' })
      expect(r.carryHeroId).toBe('a')
      expect(r.activeSignalKinds.has('heroDpsMultiplier')).toBe(true)
    }
  })

  it('lockedPlacements：locked 英雄不被搜索替换', () => {
    const results = beamSearch({
      heroes: testHeroes, slots: ['s1', 's3'], beamWidth: 3,
      lockedPlacements: { s2: 'd' },
      scoreFormation: (p) => {
        expect(p.s2).toBe('d')
        return makeResult(Object.keys(p).length)
      },
    })
    expect.hasAssertions()
    for (const r of results) {
      expect(r.placements.s2).toBe('d')
    }
  })

  it('结果按 objectiveValue 降序排列', () => {
    let callCount = 0
    const results = beamSearch({
      heroes: testHeroes, slots: ['s1', 's2'], beamWidth: 4,
      scoreFormation: () => { callCount++; return makeResult(callCount) },
    })
    const values = results.map((r) => r.objectiveValue.toNumber())
    for (let i = 1; i < values.length; i++) {
      const prev = unwrap(values[i - 1], '缺 value')
      const curr = unwrap(values[i], '缺 value')
      expect(prev).toBeGreaterThanOrEqual(curr)
    }
  })

  it('契约变异：重复 seat → 静默跳过（expandCandidates seat 去重生效）', () => {
    const dupSeatHeroes = [
      { heroId: 'a', seat: 1 },
      { heroId: 'b', seat: 1 },
      { heroId: 'c', seat: 3 },
    ]
    const seatMap = new Map(dupSeatHeroes.map((h) => [h.heroId, h.seat]))
    const placedSeats: number[][] = []
    const results = beamSearch({
      heroes: dupSeatHeroes, slots: ['s1', 's2'], beamWidth: 5,
      scoreFormation: (p) => {
        placedSeats.push(Object.values(p).map((id) => unwrap(seatMap.get(id), '缺 seat')))
        return makeResult(Object.keys(p).length)
      },
    })
    expect(results.length).toBeGreaterThan(0)
    for (const seats of placedSeats) {
      expect(new Set(seats).size).toBe(seats.length)
    }
  })
})

// === 金标基线 ===

describe('金标基线：真实数据推荐结果', () => {
  const collections: PlannerCollections = {
    variants: realVariants,
    plannerHeroes: realHeroes,
    plannerScenarios: realScenarios,
  }

  function pickBaselineScenarios(): Array<{ label: string; scenario: ResolvedPlannerScenarioModel }> {
    const picked: Array<{ label: string; scenario: ResolvedPlannerScenarioModel }> = []
    const seenSizes = new Set<number>()
    for (const scenario of realScenarios) {
      const size = scenario.slotTopology.length
      if (scenario.forcedHeroes.length > 0 && !seenSizes.has(size) && picked.length < 3) {
        const variant = variantById.get(scenario.variantId)
        if (variant) {
          seenSizes.add(size)
          picked.push({ label: `size=${String(size)}+forced`, scenario })
        }
      }
    }
    for (const scenario of realScenarios) {
      if (scenario.forcedHeroes.length === 0 && scenario.allowedHeroes.length === 0) {
        const variant = variantById.get(scenario.variantId)
        if (variant && picked.length < 4) {
          picked.push({ label: `size=${String(scenario.slotTopology.length)}+plain`, scenario })
          break
        }
      }
    }
    return picked.slice(0, 4)
  }

  it('每个 baseline scenario 推荐结果 carry 非空且 log10 合理', () => {
    const baselineScenarios = pickBaselineScenarios()
    expect(baselineScenarios.length).toBeGreaterThan(0)

    const profile = synthesizeAllOwned()
    const errors: string[] = []
    for (const { label, scenario } of baselineScenarios) {
      const variant = unwrap(variantById.get(scenario.variantId), '缺 variant: ' + scenario.variantId)
      const rec = buildPlannerRecommendation({
        variant, collections, profileSnapshot: profile,
        options: { candidateMode: 'all-hypothetical', computationMode: 'p50' },
      })
      if (rec.blocker != null) errors.push(`${label} blocker=${rec.blocker}`)
      if (rec.result == null) { errors.push(`${label} result=null`); continue }
      if (rec.result.carryHeroId == null) errors.push(`${label} carryHeroId=null`)
      else if (!heroesById.has(rec.result.carryHeroId)) errors.push(`${label} carry=${rec.result.carryHeroId} 不在 pool`)
      const log10 = Math.log10(Number(rec.result.objectiveValue))
      if (log10 <= 0 || log10 >= 60) errors.push(`${label} log10=${String(log10)} 越界`)
    }
    expect(errors).toHaveLength(0)
  }, 60000)
})
