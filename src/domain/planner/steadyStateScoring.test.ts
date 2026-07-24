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
    baseHealth: overrides.baseHealth ?? 1,
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
  enemyTypes: [],
  allowedHeroes: [],
  allowedTags: [],
  occupiedSlotCount: 0,
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

  it('team-gold 模式聚合全队 gold signal，damage 维度不泄漏', () => {
    // 3.4：金币 objective 全队聚合。gold signal 进 team_gold_find；damage signal 不影响。
    const goldHero = createHero('gold', {
      seat: 1,
      baseDamage: 1,
      supportSignals: [
        { kind: 'globalGoldMultiplier', value: 200, rawEffect: 'gold_multiplier_mult,200', source: 'official-parsed' },
      ],
    })
    const plain = createHero('plain', { seat: 2, baseDamage: 9999 })
    const heroesById = new Map([
      ['gold', goldHero],
      ['plain', plain],
    ])

    const result = scoreFormation({
      placements: { s1: 'gold', s2: 'plain' },
      heroesById,
      scenario,
      scoringMode: 'team-gold',
    })

    // gold pool: 1 + 200/100 = 3；team_gold_find = base_gold(1) × 3 = 3
    expect(result.score.toNumber()).toBeCloseTo(3, 5)
    expect(result.carryHeroId).toBeNull()
    expect(result.activeSignalKinds.has('globalGoldMultiplier')).toBe(true)
    expect(result.activeSignalKinds.has('globalDpsMultiplier')).toBe(false)
  })

  it('同阵型 carry-dps 与 team-gold 目标量不同（scoringMode 分支）', () => {
    const carry = createHero('carry', {
      seat: 1,
      baseDamage: 10,
      carrySignals: [
        { kind: 'heroDpsMultiplier', value: 100, rawEffect: 'hero_dps_multiplier_mult,100', source: 'official-parsed' },
      ],
    })
    const gold = createHero('gold', {
      seat: 2,
      supportSignals: [
        { kind: 'globalGoldMultiplier', value: 200, rawEffect: 'gold_multiplier_mult,200', source: 'official-parsed' },
      ],
    })
    const heroesById = new Map([
      ['carry', carry],
      ['gold', gold],
    ])
    const placements = { s1: 'carry', s2: 'gold' }

    const dpsMode = scoreFormation({ placements, heroesById, scenario, scoringMode: 'carry-dps' })
    const goldMode = scoreFormation({ placements, heroesById, scenario, scoringMode: 'team-gold' })

    // carry-dps: hero self-buff pool=2 → carryDps = 10 × 1.06 × 2 = 21.2
    expect(dpsMode.score.toNumber()).toBeCloseTo(21.2, 4)
    // team-gold: gold pool=3 → team_gold_find = 3
    expect(goldMode.score.toNumber()).toBeCloseTo(3, 5)
  })

  it('crit signal 进 crit_factor 提升 carryDps（4.3/4.4）', () => {
    // crit_factor 基线归一化：无 crit signal 时 =1.0；含 base chance(2.5%)/damage(100%) 使 damage buff 有意义。
    const base = createHero('base', { seat: 1, baseDamage: 10 })
    const critBuffer = createHero('crit-buf', {
      seat: 2,
      supportSignals: [
        { kind: 'globalCritDamage', value: 100, rawEffect: 'global_buff_base_crit_damage_add,100', source: 'official-parsed' },
      ],
    })
    const plain = createHero('plain', { seat: 3, baseDamage: 1 })
    const heroesById = new Map([
      ['base', base],
      ['crit-buf', critBuffer],
      ['plain', plain],
    ])

    const withoutCrit = scoreFormation({ placements: { s1: 'base', s2: 'plain' }, heroesById, scenario })
    const withCrit = scoreFormation({ placements: { s1: 'base', s2: 'crit-buf' }, heroesById, scenario })

    // crit damage +100% → damage stat 200, total_damage_mult=1+200/100=3; chance base 2.5%
    // raw_crit_factor = 1 + 0.025×(3-1) = 1.05；基线 1+0.025×(2-1)=1.025；归一 = 1.05/1.025
    // withCrit carryDps = 10 × 1.06 × (1.05/1.025)；withoutCrit = 10 × 1.06 × 1.0
    expect(withCrit.score.toNumber()).toBeGreaterThan(withoutCrit.score.toNumber())
    expect(withCrit.score.toNumber()).toBeCloseTo(10 * 1.06 * (1.05 / 1.025), 4)
    // crit signal kind 进 activeSignalKinds
    expect(withCrit.activeSignalKinds.has('globalCritDamage')).toBe(true)
  })

  it('vulnerability 条件性进 DPS（6.3/6.4：按怪物 tag 匹配）', () => {
    const carry = createHero('carry', { seat: 1, baseDamage: 10 })
    const vulnUndead = createHero('vuln-undead', {
      seat: 2,
      supportSignals: [
        { kind: 'enemyVulnerability', value: 100, rawEffect: 'increase_damage_against_monster_tag,100,undead', source: 'official-parsed', monsterTags: ['undead'] },
      ],
    })
    const vulnFiend = createHero('vuln-fiend', {
      seat: 2,
      supportSignals: [
        { kind: 'enemyVulnerability', value: 100, rawEffect: 'increase_damage_against_monster_tag,100,fiend', source: 'official-parsed', monsterTags: ['fiend'] },
      ],
    })
    const plain = createHero('plain', { seat: 3, baseDamage: 1 })
    const undeadScenario = { ...scenario, enemyTypes: ['undead'] }

    const withMatch = scoreFormation({
      placements: { s1: 'carry', s2: 'vuln-undead' },
      heroesById: new Map([['carry', carry], ['vuln-undead', vulnUndead], ['plain', plain]]),
      scenario: undeadScenario,
    })
    const withoutMatch = scoreFormation({
      placements: { s1: 'carry', s2: 'vuln-fiend' },
      heroesById: new Map([['carry', carry], ['vuln-fiend', vulnFiend], ['plain', plain]]),
      scenario: undeadScenario,
    })

    // 匹配 undead：vuln mult 2 → carryDps = 10 × 1.06 × 2 = 21.2
    expect(withMatch.score.toNumber()).toBeCloseTo(10 * 1.06 * 2, 3)
    expect(withMatch.activeSignalKinds.has('enemyVulnerability')).toBe(true)
    // fiend 不在场景 → vuln 跳过 → carryDps = 10 × 1.06
    expect(withoutMatch.score.toNumber()).toBeCloseTo(10 * 1.06, 3)
    expect(withoutMatch.activeSignalKinds.has('enemyVulnerability')).toBe(false)
  })

  it('多个 add 类 vulnerability 同 pool 相加而非累乘（6.4 pool 语义）', () => {
    // 回归（第八轮审计）：vulnerability 的 add 类信号（amountFunc 缺省=add）必须同 pool
    // 相加 (1+Σadd/100)，与 damage/gold/health pool 聚合一致。原 computeVulnerabilityFactor
    // 一律 Π 累乘，把两个 +100% 易伤算成 2×2=4（正确 1+(100+100)/100=3），高估 carryDps。
    const carry = createHero('carry', { seat: 1, baseDamage: 10 })
    const vulnA = createHero('vuln-a', {
      seat: 2,
      supportSignals: [
        { kind: 'enemyVulnerability', value: 100, rawEffect: 'damage_increase,100', source: 'official-parsed', monsterTags: null },
      ],
    })
    const vulnB = createHero('vuln-b', {
      seat: 3,
      supportSignals: [
        { kind: 'enemyVulnerability', value: 100, rawEffect: 'damage_increase,100', source: 'official-parsed', monsterTags: null },
      ],
    })
    const heroesById = new Map([['carry', carry], ['vuln-a', vulnA], ['vuln-b', vulnB]])

    const result = scoreFormation({
      placements: { s1: 'vuln-a', s2: 'carry', s3: 'vuln-b' },
      heroesById,
      scenario,
    })

    // add pool: 1 + (100+100)/100 = 3；carryDps = 10 × 1.06 × 3 = 31.8
    // 累乘 bug 会得 10 × 1.06 × 4 = 42.4
    expect(result.score.toNumber()).toBeCloseTo(10 * 1.06 * 3, 4)
  })

  it('global buff pool（patron-perk）乘进 carryDps（11.4）', () => {
    // 含全局加成（patronPerkMult pool ×2）的 carryDps 应 > 不含。
    const carry = createHero('carry', { seat: 1, baseDamage: 10 })
    const heroesById = new Map([['carry', carry]])

    const withoutGlobalBuff = scoreFormation({
      placements: { s1: 'carry' },
      heroesById,
      scenario,
    })
    const withGlobalBuff = scoreFormation({
      placements: { s1: 'carry' },
      heroesById,
      scenario,
      globalBuffMultiplier: 2,
    })

    // 无全局加成：carryDps = 10 × 1.06 × 1（无 pool）= 10.6
    expect(withoutGlobalBuff.score.toNumber()).toBeCloseTo(10.6, 4)
    // 含 ×2 全局加成：10.6 × 2 = 21.2
    expect(withGlobalBuff.score.toNumber()).toBeCloseTo(21.2, 4)
    expect(compareGameNumbers(withGlobalBuff.score, withoutGlobalBuff.score)).toBeGreaterThan(0)
  })
})
