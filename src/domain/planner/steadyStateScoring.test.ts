import { describe, expect, it } from 'vitest'
import { scoreFormation } from './steadyStateScoring'
import { compareGameNumbers } from '../simulator/gameNumber'
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

    expect(compareGameNumbers(adjacentSupportScore.objectiveValue, nonAdjacentScore.objectiveValue)).toBeGreaterThan(0)
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

    expect(compareGameNumbers(nearScore.objectiveValue, farScore.objectiveValue)).toBe(0)
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
    expect(result.objectiveValue.toNumber()).toBeCloseTo(1.06 * 3, 5)
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
    expect(result.objectiveValue.toNumber()).toBeCloseTo(1.06, 5)
  })

  it('gold 维度 signal 不泄漏进 carryDps（dimension 过滤）', () => {
    // 3.0 前置：scoreFormation 对 carryDps 聚合必须显式传 dimension:'damage'，
    // 否则引入的 gold pool 会乘进 carryDps。global gold 是全队池，不作用于伤害。
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
    expect(result.objectiveValue.toNumber()).toBeCloseTo(1.06, 5)
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
    expect(result.objectiveValue.toNumber()).toBeCloseTo(3, 5)
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
    expect(dpsMode.objectiveValue.toNumber()).toBeCloseTo(21.2, 4)
    // team-gold: gold pool=3 → team_gold_find = 3
    expect(goldMode.objectiveValue.toNumber()).toBeCloseTo(3, 5)
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
    expect(withCrit.objectiveValue.toNumber()).toBeGreaterThan(withoutCrit.objectiveValue.toNumber())
    expect(withCrit.objectiveValue.toNumber()).toBeCloseTo(10 * 1.06 * (1.05 / 1.025), 4)
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
    expect(withMatch.objectiveValue.toNumber()).toBeCloseTo(10 * 1.06 * 2, 3)
    expect(withMatch.activeSignalKinds.has('enemyVulnerability')).toBe(true)
    // fiend 不在场景 → vuln 跳过 → carryDps = 10 × 1.06
    expect(withoutMatch.objectiveValue.toNumber()).toBeCloseTo(10 * 1.06, 3)
    expect(withoutMatch.activeSignalKinds.has('enemyVulnerability')).toBe(false)
  })

  it('多个 add 类 vulnerability 同 pool 相加而非累乘（6.4 pool 语义）', () => {
    // 回归：vulnerability 的 add 类信号（amountFunc 缺省=add）必须同 pool
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
    expect(result.objectiveValue.toNumber()).toBeCloseTo(10 * 1.06 * 3, 4)
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
    expect(withoutGlobalBuff.objectiveValue.toNumber()).toBeCloseTo(10.6, 4)
    // 含 ×2 全局加成：10.6 × 2 = 21.2
    expect(withGlobalBuff.objectiveValue.toNumber()).toBeCloseTo(21.2, 4)
    expect(compareGameNumbers(withGlobalBuff.objectiveValue, withoutGlobalBuff.objectiveValue)).toBeGreaterThan(0)
  })

  describe('aggregateProjection 投影模式（约束②）', () => {
    it('formation-buff 只取阵型内聚合，排除 baseDamage/levelCurve/globalBuff', () => {
      const carry = createHero('carry', { seat: 1, baseDamage: 10 })
      const support = createHero('buf', {
        seat: 2,
        supportSignals: [
          { kind: 'globalDpsMultiplier', value: 200, rawEffect: 'global_dps,200', source: 'official-parsed' },
        ],
      })
      const heroesById = new Map([['carry', carry], ['buf', support]])
      const placements = { s1: 'carry', s2: 'buf' }

      // absolute-dps（默认）：含 baseDamage/levelCurve/globalBuff → 10 × 1.06 × damagePool(3) × 5 = 159
      const abs = scoreFormation({ placements, heroesById, scenario, globalBuffMultiplier: 5 })
      expect(abs.objectiveValue.toNumber()).toBeCloseTo(10 * 1.06 * 3 * 5, 3)
      expect(abs.areaEstimate).not.toBeNull()

      // formation-buff：只 damagePool×crit×vuln = 3，与 baseDamage/levelCurve/globalBuff 无关
      const fb = scoreFormation({ placements, heroesById, scenario, globalBuffMultiplier: 5, aggregateProjection: 'formation-buff' })
      expect(fb.objectiveValue.toNumber()).toBeCloseTo(3, 6)
      // formation-buff 模式 bestCarryDps 是聚合倍率（非真实 DPS），areaEstimate 无意义 → null
      expect(fb.areaEstimate).toBeNull()
    })

    it('formation-buff 不受 globalBuff / baseDamage 影响（外部加成+绝对基线都排除）', () => {
      const support = createHero('buf', {
        seat: 2,
        supportSignals: [
          { kind: 'globalDpsMultiplier', value: 200, rawEffect: 'global_dps,200', source: 'official-parsed' },
        ],
      })
      const placements = { s1: 'carry', s2: 'buf' }

      const base = scoreFormation({
        placements,
        heroesById: new Map([['carry', createHero('carry', { baseDamage: 10 })], ['buf', support]]),
        scenario,
        globalBuffMultiplier: 5,
        aggregateProjection: 'formation-buff',
      })
      // 改 globalBuff（外部加成）→ formation-buff 不变
      const noGlobal = scoreFormation({
        placements,
        heroesById: new Map([['carry', createHero('carry', { baseDamage: 10 })], ['buf', support]]),
        scenario,
        aggregateProjection: 'formation-buff',
      })
      expect(noGlobal.objectiveValue.toNumber()).toBeCloseTo(base.objectiveValue.toNumber(), 6)
      // 改 baseDamage（绝对基线）→ formation-buff 不变
      const bigBase = scoreFormation({
        placements,
        heroesById: new Map([['carry', createHero('carry', { baseDamage: 9999 })], ['buf', support]]),
        scenario,
        aggregateProjection: 'formation-buff',
      })
      expect(bigBase.objectiveValue.toNumber()).toBeCloseTo(base.objectiveValue.toNumber(), 6)
    })
  })

  describe('breakdown 结构化拆解', () => {
    it('carry-dps 输出 best carry 的完整加成拆解（baseDps/factors/pools/contributions）', () => {
      const carry = createHero('carry', {
        seat: 1,
        baseDamage: 10,
        carrySignals: [
          { kind: 'heroDpsMultiplier', value: 100, rawEffect: 'hero_dps_mult,100', source: 'official-parsed' },
        ],
      })
      const support = createHero('buf', {
        seat: 2,
        supportSignals: [
          { kind: 'globalDpsMultiplier', value: 200, rawEffect: 'global_dps,200', source: 'official-parsed' },
        ],
      })
      const heroesById = new Map([['carry', carry], ['buf', support]])

      const result = scoreFormation({
        placements: { s1: 'carry', s2: 'buf' },
        heroesById,
        scenario,
      })

      const breakdown = result.breakdown
      expect(breakdown).not.toBeNull()
      expect(breakdown!.carryHeroId).toBe('carry')
      expect(breakdown!.carrySlotId).toBe('s1')
      expect(breakdown!.carryLevel).toBe(1)
      // baseDps = baseDamage(10) × levelCurve(1.06) = 10.6；加成前基线
      expect(Number(breakdown!.baseDps)).toBeCloseTo(10.6, 4)
      // levelCurve 是游戏记数法字符串（与 baseDps/carryDps 同契约），Number 解析后 ≈ rate
      expect(Number(breakdown!.levelCurve)).toBeCloseTo(1.06, 4)
      // carryDps = baseDps × damagePool(2×3) = 10.6 × 6 = 63.6；与 score 一致
      expect(Number(breakdown!.carryDps)).toBeCloseTo(63.6, 4)
      expect(breakdown!.factors.damagePool).toBeCloseTo(6, 4)
      expect(breakdown!.factors.crit).toBeCloseTo(1, 6)
      expect(breakdown!.factors.vulnerability).toBeCloseTo(1, 6)
      expect(breakdown!.factors.globalBuff).toBeCloseTo(1, 6)
      expect(breakdown!.factors.heroDpsPool).toBeCloseTo(1, 6)
      // pools：hero self（addPercent 100 → ×2）与 global（addPercent 200 → ×3）
      const heroPool = breakdown!.pools.find((p) => p.addPercent === 100)
      expect(heroPool?.poolMultiplier).toBeCloseTo(2, 6)
      const globalPool = breakdown!.pools.find((p) => p.addPercent === 200)
      expect(globalPool?.poolMultiplier).toBeCloseTo(3, 6)
      // contributions：carry 自带 heroDpsMultiplier、buf 贡献 globalDpsMultiplier
      const bufContribution = breakdown!.contributions.find((c) => c.supportHeroId === 'buf')
      expect(bufContribution?.signals.some((s) => s.signalKind === 'globalDpsMultiplier' && Math.abs(s.multiplier - 3) < 1e-6)).toBe(true)
      const carryContribution = breakdown!.contributions.find((c) => c.supportHeroId === 'carry')
      expect(carryContribution?.signals.some((s) => s.signalKind === 'heroDpsMultiplier')).toBe(true)
    })

    it('heroDpsPool = 装备 + 外部 hero_dps 同池加法（breakdown 因子可相乘复现 carryDps）', () => {
      // 装备（+50%→1.5）与外部 patron/blessing hero_dps（+200%）同为 hero_dps_multiplier_mult，
      // IC 同 key 加法叠加 → heroDpsPool = 1.5 + 2.0 = 3.5（非各自独立乘 1.5×3=4.5）。
      // breakdown 须外露合并后的单一因子，使 baseDps × Π factors = carryDps 可复现。
      const carry = createHero('carry', { seat: 1, baseDamage: 10 })
      const heroesById = new Map([['carry', carry]])
      const result = scoreFormation({
        placements: { s1: 'carry' },
        heroesById,
        scenario,
        equipmentAdjustmentByHero: new Map([['carry', 1.5]]),
        externalHeroDpsContributions: [{ value: 200, qualifier: null }],
      })
      const b = result.breakdown!
      expect(b.factors.heroDpsPool).toBeCloseTo(3.5, 6)
      const recomputed = Number(b.baseDps)
        * b.factors.damagePool * b.factors.crit * b.factors.vulnerability
        * b.factors.globalBuff * b.factors.heroDpsPool
      expect(recomputed).toBeCloseTo(Number(b.carryDps), 4)
    })

    it('全因子同时非默认时 baseDps × Π factors = carryDps（防新增因子漏乘/漏外露）', () => {
      // §6.3 组合守护：单因子非默认的测试（上方 damagePool / heroDpsPool 各测）无法发现
      // 「某因子乘进 carryDps 却未外露进 factors」（或反之）的非对称回归——heroDpsPool 曾是此形 bug
      // （equipment/external 分列两独立 × 因子，实际加法合并）。全因子同时 ≠ 1 时，任一因子漏乘或漏外露
      // 都使重算乘积 ≠ carryDps；单因子测试因其余因子 = 1 而漏检。
      const carry = createHero('carry', {
        seat: 1,
        baseDamage: 10,
        carrySignals: [
          { kind: 'heroDpsMultiplier', value: 100, rawEffect: 'hero_dps_mult,100', source: 'official-parsed' },
        ],
      })
      const critBuf = createHero('crit', {
        seat: 2,
        supportSignals: [
          { kind: 'globalCritDamage', value: 100, rawEffect: 'crit_dmg,100', source: 'official-parsed' },
        ],
      })
      const vulnBuf = createHero('vuln', {
        seat: 3,
        supportSignals: [
          { kind: 'enemyVulnerability', value: 100, rawEffect: 'vuln,100', source: 'official-parsed', monsterTags: [] },
        ],
      })
      const heroesById = new Map([['carry', carry], ['crit', critBuf], ['vuln', vulnBuf]])

      const result = scoreFormation({
        placements: { s1: 'carry', s2: 'crit', s3: 'vuln' },
        heroesById,
        scenario,
        globalBuffMultiplier: 1.5,
        equipmentAdjustmentByHero: new Map([['carry', 1.5]]),
        externalHeroDpsContributions: [{ value: 200, qualifier: null }],
      })
      const b = result.breakdown!

      // 全因子同时非默认——任一为 1 则该因子的非对称回归不可见
      expect(b.factors.damagePool).toBeGreaterThan(1)
      expect(b.factors.crit).toBeGreaterThan(1)
      expect(b.factors.vulnerability).toBeGreaterThan(1)
      expect(b.factors.globalBuff).toBeGreaterThan(1)
      expect(b.factors.heroDpsPool).toBeGreaterThan(1)

      // carryDps = baseDps × Π factors（steadyStateScoring.ts breakdown 契约）。
      // 对照 objectiveValue（bestCarryDps 全精度 Decimal），非 breakdown.carryDps 显示字符串——
      // 后者是 2 位尾数舍入形式（如 228.029 → "2.28e2" → 228），会吃掉精度。
      const product = Number(b.baseDps)
        * b.factors.damagePool * b.factors.crit * b.factors.vulnerability
        * b.factors.globalBuff * b.factors.heroDpsPool
      expect(product).toBeCloseTo(result.objectiveValue.toNumber(), 6)
    })

    it('team-gold 模式与空阵型 breakdown 为 null', () => {
      const carry = createHero('carry', { seat: 1, baseDamage: 10 })
      const gold = createHero('gold', {
        seat: 2,
        supportSignals: [
          { kind: 'globalGoldMultiplier', value: 200, rawEffect: 'gold,200', source: 'official-parsed' },
        ],
      })
      const heroesById = new Map([['carry', carry], ['gold', gold]])

      const empty = scoreFormation({ placements: {}, heroesById, scenario })
      expect(empty.breakdown).toBeNull()

      const teamGold = scoreFormation({
        placements: { s1: 'gold', s2: 'carry' },
        heroesById,
        scenario,
        scoringMode: 'team-gold',
      })
      expect(teamGold.breakdown).toBeNull()
    })

    it('crit/vulnerability factor 在 breakdown 中体现', () => {
      const carry = createHero('carry', { seat: 1, baseDamage: 10 })
      const critBuf = createHero('crit', {
        seat: 2,
        supportSignals: [
          { kind: 'globalCritDamage', value: 100, rawEffect: 'crit_dmg,100', source: 'official-parsed' },
        ],
      })
      const vulnBuf = createHero('vuln', {
        seat: 3,
        supportSignals: [
          { kind: 'enemyVulnerability', value: 100, rawEffect: 'vuln,100', source: 'official-parsed', monsterTags: [] },
        ],
      })
      const heroesById = new Map([['carry', carry], ['crit', critBuf], ['vuln', vulnBuf]])

      const result = scoreFormation({
        placements: { s1: 'carry', s2: 'crit', s3: 'vuln' },
        heroesById,
        scenario,
      })

      expect(result.breakdown!.factors.crit).toBeGreaterThan(1)
      // monsterTags 空 → 视为无条件匹配（与 computeVulnerabilityFactor 一致）
      expect(result.breakdown!.factors.vulnerability).toBeGreaterThan(1)
    })

    it('levelCurve 为字符串，高 level 也不溢出为 null（JSON 契约）', () => {
      // 契约：development-design-simulator.md 声明 levelCurve 为「游戏记数法字符串，可超 MAX_VALUE」。
      // 原 .toNumber() 在 1.06^20000（≈10^506）溢出为 Infinity，JSON.stringify 静默变 null，破坏契约。
      const carry = createHero('carry', { seat: 1, baseDamage: 1 })
      const heroesById = new Map([['carry', carry]])
      const result = scoreFormation({
        placements: { s1: 'carry' },
        heroesById,
        scenario,
        heroLevels: new Map([['carry', 20000]]),
      })
      const breakdown = result.breakdown!
      expect(typeof breakdown.levelCurve).toBe('string')
      // JSON 序列化往返不丢值（原 bug：Infinity → null）
      const roundTrip = JSON.parse(JSON.stringify({ levelCurve: breakdown.levelCurve })) as { levelCurve: unknown }
      expect(roundTrip.levelCurve).not.toBeNull()
      expect(typeof roundTrip.levelCurve).toBe('string')
    })
  })

  it('装备调整比缩放 carryDps（13.4：owned rarity < max → 下调）', () => {
    const carry = createHero('carry', { seat: 1, baseDamage: 10 })
    const heroesById = new Map([['carry', carry]])

    const theoretical = scoreFormation({
      placements: { s1: 'carry' },
      heroesById,
      scenario,
    })
    const adjusted = scoreFormation({
      placements: { s1: 'carry' },
      heroesById,
      scenario,
      equipmentAdjustmentByHero: new Map([['carry', 0.5]]),
    })

    // 理论 10.6；调整比 0.5 → 5.3（owned 装备弱于理论最大）
    expect(theoretical.objectiveValue.toNumber()).toBeCloseTo(10.6, 4)
    expect(adjusted.objectiveValue.toNumber()).toBeCloseTo(5.3, 4)
    expect(compareGameNumbers(adjusted.objectiveValue, theoretical.objectiveValue)).toBeLessThan(0)
  })

  it('manualStackCount 透传到 dynamic-stack-multiply signal', () => {
    // stacksMultiply signal 按 manualStackCount 乘算；不同假设值 → carryDps 倍率 = 2^Δ。
    // 验证透传链 ScoringInput.manualStackCount → evaluatePlacementFit → scoreBreakdown。
    const carry = createHero('carry', {
      seat: 1,
      roles: ['dps'],
      carrySignals: [
        { kind: 'heroDpsMultiplier', value: 100, rawEffect: 'buff_upgrade,100,1', source: 'official-parsed', stacksMultiply: true },
      ],
    })
    const heroesById = new Map([['carry', carry]])
    const placements = { s2: 'carry' }

    const low = scoreFormation({ placements, heroesById, scenario, manualStackCount: 5 })
    const high = scoreFormation({ placements, heroesById, scenario, manualStackCount: 10 })

    // baseDps×levelCurve 不变 → objectiveValue 比值 = damagePool 比值 = 2^10 / 2^5 = 32
    expect(high.objectiveValue.toNumber() / low.objectiveValue.toNumber()).toBeCloseTo(32, 0)
  })
})
