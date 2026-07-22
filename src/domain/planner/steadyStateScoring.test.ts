import { describe, expect, it } from 'vitest'
import { scoreFormation } from './steadyStateScoring'
import { compareGameNumbers } from '../simulator/gameNumberArithmetic'
import type { HeroAbilityProfile } from '../abilities/abilityModel'
import type { OfficialPlannerScenarioModel } from './plannerModel'

function createHero(heroId: string, overrides: Partial<HeroAbilityProfile> = {}): HeroAbilityProfile {
  return {
    heroId,
    name: { original: heroId, display: heroId },
    seat: overrides.seat ?? 1,
    roles: overrides.roles ?? [],
    tags: overrides.tags ?? [],
    baseAttackDamageTypes: overrides.baseAttackDamageTypes ?? [],
    baseAttackCooldown: overrides.baseAttackCooldown ?? null,
    age: overrides.age ?? null,
    abilityScores: overrides.abilityScores ?? {},
    baseDamage: overrides.baseDamage ?? 1,
    carrySignals: overrides.carrySignals ?? [],
    supportSignals: overrides.supportSignals ?? [],
    unsupportedSignals: overrides.unsupportedSignals ?? [],
    sourceBreakdown: overrides.sourceBreakdown ?? {
      carrySignals: [],
      supportSignals: [],
      unsupportedSignals: [],
    },
  }
}

const scenario: OfficialPlannerScenarioModel = {
  variantId: 'variant-1',
  scenarioRef: { kind: 'variant', id: 'variant-1' },
  name: { original: 'Test', display: 'Test' },
  formationLayoutId: 'layout-a',
  objectiveArea: 1,
  slotTopology: [
    { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
    { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
    { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2'] },
  ],
  forcedHeroes: [],
  bannedHeroes: [],
  lockedSlots: [],
  scenarioWarnings: [],
}

describe('steady state scoring', () => {
  it('相邻增益支持位靠近 carry 时评分更高', () => {
    const carry = createHero('carry', {
      seat: 1,
      roles: ['dps'],
      carrySignals: [
        { kind: 'heroDpsMultiplier', value: 100, rawEffect: 'hero_dps_multiplier_mult,100', source: 'official-parsed' },
      ],
    })
    const support = createHero('bruenor', {
      seat: 2,
      supportSignals: [
        { kind: 'adjacentBuff', value: 100, rawEffect: 'adjacent_buff,100', source: 'official-parsed' },
      ],
    })
    const heroesById = new Map([
      ['carry', carry],
      ['bruenor', support],
    ])

    const adjacentSupportScore = scoreFormation({
      placements: { s1: 'bruenor', s2: 'carry' },
      heroesById,
      scenario,
    })

    const nonAdjacentScore = scoreFormation({
      placements: { s1: 'bruenor', s3: 'carry' },
      heroesById,
      scenario,
    })

    expect(compareGameNumbers(adjacentSupportScore.score, nonAdjacentScore.score)).toBeGreaterThan(0)
  })

  it('global support 不受 adjacency 影响', () => {
    const carry = createHero('carry', {
      seat: 1,
      roles: ['dps'],
      baseDamage: 100,
    })
    const support = createHero('global-buffer', {
      seat: 2,
      supportSignals: [
        { kind: 'globalDpsMultiplier', value: 200, rawEffect: 'global_dps_multiplier_mult,200', source: 'official-parsed' },
      ],
    })
    const heroesById = new Map([
      ['carry', carry],
      ['global-buffer', support],
    ])

    const nearScore = scoreFormation({
      placements: { s1: 'global-buffer', s2: 'carry' },
      heroesById,
      scenario,
    })

    const farScore = scoreFormation({
      placements: { s1: 'global-buffer', s3: 'carry' },
      heroesById,
      scenario,
    })

    expect(compareGameNumbers(nearScore.score, farScore.score)).toBe(0)
    expect(nearScore.carryHeroId).toBe('carry')
  })

  it('多个支持位向同一 global pool 贡献 additive 加成时跨位相加（非累乘）', () => {
    // 回归：scoreFormation 必须把不同支持位向同一 dimension:scope pool 的 additive
    // 贡献合并相加，而不是把每位独立 pool 的乘积再相乘。
    // 两位辅助各给 carry +100% global dps：正确 = 1+(100+100)/100 = 3（非 (1+1)*(1+1)=4）。
    const carry = createHero('carry', { seat: 1, baseDamage: 1 })
    const supportA = createHero('buf-a', {
      seat: 2,
      supportSignals: [
        { kind: 'globalDpsMultiplier', value: 100, rawEffect: 'g_a,100', source: 'official-parsed' },
      ],
    })
    const supportB = createHero('buf-b', {
      seat: 3,
      supportSignals: [
        { kind: 'globalDpsMultiplier', value: 100, rawEffect: 'g_b,100', source: 'official-parsed' },
      ],
    })
    const heroesById = new Map([
      ['carry', carry],
      ['buf-a', supportA],
      ['buf-b', supportB],
    ])

    const result = scoreFormation({
      placements: { s1: 'buf-a', s2: 'carry', s3: 'buf-b' },
      heroesById,
      scenario,
    })

    // global pool addPercent = 200 → poolMultiplier = 3；carryDps = baseDamage(1) × levelCurve(1, 1.06) × 3 = 3.18
    expect(result.score.toNumber()).toBeCloseTo(1.06 * 3, 5)
  })

  it('缺少 tagged target qualifier 时只进入 warning，不计分', () => {
    const carry = createHero('carry', {
      seat: 1,
      roles: ['dps'],
      tags: ['female'],
    })
    const support = createHero('tag-buffer', {
      seat: 2,
      supportSignals: [
        { kind: 'taggedChampionBuff', value: 100, rawEffect: 'tag_dps,100', source: 'official-parsed' },
      ],
    })
    const heroesById = new Map([
      ['carry', carry],
      ['tag-buffer', support],
    ])

    const result = scoreFormation({
      placements: { s1: 'carry', s2: 'tag-buffer' },
      heroesById,
      scenario,
    })

    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('缺少 carry 目标标签')
    // carryDps = baseDamage(1) × levelCurve(1, 1.06) × aggregate(1，tagged buff 未计分)
    expect(result.score.toNumber()).toBeCloseTo(1.06, 5)
  })

  it('gold 维度 signal 不泄漏进 carryDps（dimension 过滤）', () => {
    // 3.0 前置：scoreFormation 对 carryDps 聚合必须显式传 dimension:'damage'，
    // 否则阶段 3 引入的 gold pool 会乘进 carryDps。global gold 是全队池，不作用于伤害。
    const carry = createHero('carry', { seat: 1, baseDamage: 1 })
    const goldSupport = createHero('gold-finder', {
      seat: 2,
      supportSignals: [
        { kind: 'globalGoldMultiplier', value: 200, rawEffect: 'gold_multiplier_mult,200', source: 'official-parsed' },
      ],
    })
    const heroesById = new Map([
      ['carry', carry],
      ['gold-finder', goldSupport],
    ])

    const result = scoreFormation({
      placements: { s1: 'carry', s2: 'gold-finder' },
      heroesById,
      scenario,
    })

    // gold signal 被过滤，aggregate=1；carryDps = baseDamage(1) × levelCurve(1, 1.06) = 1.06
    // 若 dimension 过滤失效，gold pool(=3) 会乘进 → 3.18，断言会失败。
    expect(result.score.toNumber()).toBeCloseTo(1.06, 5)
    expect(result.activeSignalKinds.has('globalGoldMultiplier')).toBe(false)
  })
})
