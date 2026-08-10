import { describe, expect, it } from 'vitest'
import { unwrap } from '../../../tests/utils/dom-assertions'
import { compareGameNumbers } from '../gameNumber'
import type { HeroAbilityProfile, HeroAbilitySignal } from '../abilities/abilityModel'
import { scoreFormation } from './steadyStateScoring'
import { type OfficialPlannerScenarioModel, EMPTY_VIABILITY_CONTEXT } from './plannerModel'

// === Shared fixtures（与 steadyStateScoring.test.ts 同构，不 import 测试文件） ===

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
    { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2', 's4'] },
    { slotId: 's4', row: 2, column: 1, adjacentSlotIds: ['s1'] },
  ],
  forcedHeroes: [],
  enemyTypes: [],
  allowedHeroes: [],
  allowedTagExpression: [],
  attributeRequirements: [],
  occupiedSlotCount: 0,
  viabilityContext: EMPTY_VIABILITY_CONTEXT,
  damageSourcePattern: null,
  scenarioWarnings: [],
}

function globalDps(value: number): HeroAbilitySignal {
  return { kind: 'globalDpsMultiplier', value, rawEffect: `global_dps,${String(value)}`, source: 'official-parsed' }
}

function globalDpsMult(value: number): HeroAbilitySignal {
  return { kind: 'globalDpsMultiplier', value, rawEffect: `global_dps_mult,${String(value)}`, source: 'official-parsed', amountFunc: 'mult' }
}

function heroDps(value: number): HeroAbilitySignal {
  return { kind: 'heroDpsMultiplier', value, rawEffect: `hero_dps,${String(value)}`, source: 'official-parsed' }
}

// === A. 纯函数不变量 ===

describe('scoreFormation 不变量守护', () => {
  describe('确定性（相同输入恒产相同输出）', () => {
    it('多次调用 objectiveValue / carryHeroId / breakdown 恒等', () => {
      const carry = createHero('carry', {
        seat: 1, baseDamage: 10,
        carrySignals: [heroDps(100)],
      })
      const support = createHero('buf', {
        seat: 2,
        supportSignals: [globalDps(200)],
      })
      const heroesById = new Map([['carry', carry], ['buf', support]])
      const input = { placements: { s1: 'carry', s2: 'buf' }, heroesById, scenario }

      const r1 = scoreFormation(input)
      const r2 = scoreFormation(input)
      const r3 = scoreFormation(input)

      expect(compareGameNumbers(r1.objectiveValue, r2.objectiveValue)).toBe(0)
      expect(compareGameNumbers(r2.objectiveValue, r3.objectiveValue)).toBe(0)
      expect(r1.carryHeroId).toBe(r2.carryHeroId)
      expect(r2.carryHeroId).toBe(r3.carryHeroId)
      // breakdown 结构等价（JSON 可序列化对比）
      expect(JSON.stringify(r1.breakdown)).toBe(JSON.stringify(r2.breakdown))
      expect(JSON.stringify(r2.breakdown)).toBe(JSON.stringify(r3.breakdown))
    })
  })

  describe('输入不可变性（scoreFormation 不修改传入夹具）', () => {
    it('placements / heroesById / hero profiles 深克隆验同', () => {
      const carry = createHero('carry', {
        seat: 1, baseDamage: 10,
        carrySignals: [heroDps(100)],
      })
      const support = createHero('buf', {
        seat: 2,
        supportSignals: [globalDps(200)],
      })
      const heroesById = new Map([['carry', carry], ['buf', support]])
      const placements = { s1: 'carry', s2: 'buf' }

      // 深快照
      const placementsSnapshot = JSON.stringify(placements)
      const carrySnapshot = JSON.stringify(carry)
      const supportSnapshot = JSON.stringify(support)
      const mapKeysSnapshot = [...heroesById.keys()].join(',')

      scoreFormation({ placements, heroesById, scenario })

      expect(JSON.stringify(placements)).toBe(placementsSnapshot)
      expect(JSON.stringify(carry)).toBe(carrySnapshot)
      expect(JSON.stringify(support)).toBe(supportSnapshot)
      expect([...heroesById.keys()].join(',')).toBe(mapKeysSnapshot)
    })
  })

  describe('同池加成交换律（打乱 support 来源顺序 carryDps 不变）', () => {
    // 核心不变量：pool 聚合按 dimension:scope 加法叠加，与来源顺序无关。
    // 现有 poolAggregation.test 只测 mergePools 层交换律，这里测 scoreFormation 全链路。
    it.each([
      // [label, signalFactory, supportValues]
      ['两个 global 支持', globalDps, [100, 200]],
      ['三个 global 支持', globalDps, [50, 150, 300]],
      ['含 mult 类支持', globalDpsMult, [100, 200]],
    ] as const)('%s → 不同 slot 排列 carryDps 相同', (_label, signalFactory, values) => {
      const carry = createHero('carry', { seat: 1, baseDamage: 1 })
      const heroesById = new Map<string, HeroAbilityProfile>([['carry', carry]])
      values.forEach((v, i) => {
        heroesById.set(`buf${String(i)}`, createHero(`buf${String(i)}`, {
          seat: i + 2,
          supportSignals: [signalFactory(v)],
        }))
      })

      // 两种排列：正向 slot 顺序 vs 反向
      const forward: Record<string, string> = { s1: 'carry' }
      const reverse: Record<string, string> = { s4: 'carry' } // carry 放不同槽，support 占不同 slot
      values.forEach((_, i) => {
        forward[`s${String(i + 2)}`] = `buf${String(i)}`
        reverse[`s${String(i + 2)}`] = `buf${String(values.length - 1 - i)}`
      })

      const rForward = scoreFormation({ placements: forward, heroesById, scenario })
      const rReverse = scoreFormation({ placements: reverse, heroesById, scenario })

      // global signal 不受位置影响 → carryDps 须相同（pool 加法交换律）
      expect(compareGameNumbers(rForward.objectiveValue, rReverse.objectiveValue)).toBe(0)
    })
  })

  describe('单调性（加入/移除正加成 support → carryDps 不降/不升）', () => {
    it('加入正 global_dps support → carryDps 上升', () => {
      const carry = createHero('carry', { seat: 1, baseDamage: 10 })
      const support = createHero('buf', {
        seat: 2,
        supportSignals: [globalDps(100)],
      })
      const heroesById = new Map([['carry', carry], ['buf', support]])

      const solo = scoreFormation({ placements: { s1: 'carry' }, heroesById, scenario })
      const withSupport = scoreFormation({ placements: { s1: 'carry', s2: 'buf' }, heroesById, scenario })

      expect(compareGameNumbers(withSupport.objectiveValue, solo.objectiveValue)).toBeGreaterThan(0)
    })

    it('移除正 global_dps support → carryDps 下降', () => {
      const carry = createHero('carry', { seat: 1, baseDamage: 10 })
      const support = createHero('buf', {
        seat: 2,
        supportSignals: [globalDps(100)],
      })
      const heroesById = new Map([['carry', carry], ['buf', support]])

      const withSupport = scoreFormation({ placements: { s1: 'carry', s2: 'buf' }, heroesById, scenario })
      const afterRemove = scoreFormation({ placements: { s1: 'carry' }, heroesById, scenario })

      expect(compareGameNumbers(afterRemove.objectiveValue, withSupport.objectiveValue)).toBeLessThan(0)
    })

    it('加入 value=0 的 support → carryDps 不变（零加成不改变目标量）', () => {
      const carry = createHero('carry', { seat: 1, baseDamage: 10 })
      const zero = createHero('zero', {
        seat: 2,
        supportSignals: [globalDps(0)],
      })
      const heroesById = new Map([['carry', carry], ['zero', zero]])

      const solo = scoreFormation({ placements: { s1: 'carry' }, heroesById, scenario })
      const withZero = scoreFormation({ placements: { s1: 'carry', s2: 'zero' }, heroesById, scenario })

      expect(compareGameNumbers(withZero.objectiveValue, solo.objectiveValue)).toBe(0)
    })
  })

  describe('breakdown 因子之积恒复现 carryDps（多组合属性断言）', () => {
    // 现有测试只覆盖 1 组全因子非默认组合（:496）。
    // 这里用 it.each 构造多组不同组合，任一因子漏乘或漏外露都会被某组合抓到。
    it.each([
      {
        label: '仅 global buff',
        carryDmg: 10,
        carrySignals: [] as HeroAbilitySignal[],
        supports: [] as Array<{ signals: HeroAbilitySignal[]; seat: number }>,
        globalBuff: 1,
      },
      {
        label: 'global + heroDps',
        carryDmg: 10,
        carrySignals: [heroDps(100)],
        supports: [{ signals: [globalDps(200)], seat: 2 }],
        globalBuff: 1,
      },
      {
        label: '全因子非默认（crit + vuln + global + heroDps）',
        carryDmg: 10,
        carrySignals: [heroDps(100)],
        supports: [
          { signals: [{ kind: 'globalCritDamage' as const, value: 100, rawEffect: 'crit,100', source: 'official-parsed' as const }], seat: 2 },
          { signals: [{ kind: 'enemyVulnerability' as const, value: 100, rawEffect: 'vuln,100', source: 'official-parsed' as const, monsterTags: [] }], seat: 3 },
        ],
        globalBuff: 1.5,
      },
      {
        label: '大基数 global + 外部装备调整',
        carryDmg: 1,
        carrySignals: [] as HeroAbilitySignal[],
        supports: [
          { signals: [globalDps(500)], seat: 2 },
          { signals: [globalDps(300)], seat: 3 },
        ],
        globalBuff: 3,
      },
    ])('$label → baseDps × Πfactors ≈ carryDps', (fixture) => {
      const carry = createHero('carry', {
        seat: 1, baseDamage: fixture.carryDmg,
        carrySignals: fixture.carrySignals,
      })
      const heroesById = new Map<string, HeroAbilityProfile>([['carry', carry]])
      for (const sup of fixture.supports) {
        heroesById.set(`s${String(sup.seat)}`, createHero(`s${String(sup.seat)}`, {
          seat: sup.seat,
          supportSignals: sup.signals,
        }))
      }

      const placements: Record<string, string> = { s1: 'carry' }
      for (const sup of fixture.supports) {
        placements[`s${String(sup.seat)}`] = `s${String(sup.seat)}`
      }

      const result = scoreFormation({
        placements, heroesById, scenario,
        globalBuffMultiplier: fixture.globalBuff,
      })
      const b = unwrap(result.breakdown, 'breakdown 应非空')

      const product = Number(b.baseDps)
        * b.factors.damagePool * b.factors.crit * b.factors.vulnerability
        * b.factors.globalBuff * b.factors.heroDpsPool

      // 全精度对照 objectiveValue（非 breakdown.carryDps 显示串）
      expect(product).toBeCloseTo(result.objectiveValue.toNumber(), 4)
    })
  })
})

// === B. 对抗性反例 ===

describe('scoreFormation 对抗性反例', () => {
  describe('极端数值注入', () => {
    it('baseDamage=0 → 静默校正为 1（computeCarryDps guard: baseDamage>0?baseDamage:1）→ carryDps≠0', () => {
      // 反例发现：computeCarryDps（baseDps.ts:31）把 baseDamage≤0 静默替换为 1。
      // 结果：zero-damage 英雄被当作 baseDamage=1 评分，carryDps=1×levelCurve×aggregate。
      // 行为 = 静默错误（非 fail-fast，非零分）——数据损坏不可见。
      const carry = createHero('carry', { seat: 1, baseDamage: 0 })
      const result = scoreFormation({
        placements: { s1: 'carry' },
        heroesById: new Map([['carry', carry]]),
        scenario,
      })
      const num = result.objectiveValue.toNumber()
      expect(Number.isFinite(num)).toBe(true)
      expect(Number.isNaN(num)).toBe(false)
      // baseDamage 0→1, levelCurve≈1.06, aggregate=1 → carryDps≈1.06
      expect(num).toBeCloseTo(1.06, 4)
      expect(result.carryHeroId).toBe('carry')
    })

    it('baseDamage=NaN → 静默校正为 1（NaN>0=false→fallback 1）→ carry 被选中', () => {
      // 反例发现：NaN>0=false → computeCarryDps guard 走 fallback → baseDamage=1。
      // NaN 数据损坏完全不可见，hero 被 scoreFormation 正常评分。
      const carry = createHero('carry', { seat: 1, baseDamage: Number.NaN })
      const result = scoreFormation({
        placements: { s1: 'carry' },
        heroesById: new Map([['carry', carry]]),
        scenario,
      })
      const num = result.objectiveValue.toNumber()
      expect(Number.isNaN(num)).toBe(false)
      expect(result.carryHeroId).toBe('carry')
      expect(num).toBeCloseTo(1.06, 4)
    })

    it('负 baseDamage → 静默校正为 1（-10>0=false→fallback 1）→ carry 被选中', () => {
      // 反例发现：负值 baseDamage 被 guard 替换为 1，负伤害英雄被正常评分。
      const carry = createHero('carry', { seat: 1, baseDamage: -10 })
      const result = scoreFormation({
        placements: { s1: 'carry' },
        heroesById: new Map([['carry', carry]]),
        scenario,
      })
      const num = result.objectiveValue.toNumber()
      expect(Number.isFinite(num)).toBe(true)
      expect(result.carryHeroId).toBe('carry')
      // baseDamage -10→1, levelCurve≈1.06 → carryDps≈1.06（非 -10.6）
      expect(num).toBeCloseTo(1.06, 4)
    })

    it('Infinity baseDamage → guard 通过（Infinity>0=true）→ carry 被选中', () => {
      // Infinity>0=true → 不走 fallback → toGameNumber(Infinity) = Decimal(Infinity)
      const carry = createHero('carry', { seat: 1, baseDamage: Number.POSITIVE_INFINITY })
      const result = scoreFormation({
        placements: { s1: 'carry' },
        heroesById: new Map([['carry', carry]]),
        scenario,
      })
      expect(result).toBeDefined()
      expect(result.carryHeroId).toBe('carry')
    })
  })

  describe('lockedCarryHeroId 边界', () => {
    it('lockedCarryHeroId 指向不在阵型中的英雄 → objectiveValue=ZERO（所有候选被跳过）', () => {
      const carry = createHero('carry', { seat: 1, baseDamage: 10 })
      const heroesById = new Map([['carry', carry]])
      const result = scoreFormation({
        placements: { s1: 'carry' },
        heroesById,
        scenario,
        lockedCarryHeroId: 'nonexistent-hero',
      })
      expect(result.objectiveValue.toNumber()).toBe(0)
      expect(result.carryHeroId).toBeNull()
      expect(result.breakdown).toBeNull()
    })

    it('lockedCarryHeroId 空字符串 → 不锁定（正常评估）', () => {
      const carry = createHero('carry', { seat: 1, baseDamage: 10 })
      const heroesById = new Map([['carry', carry]])
      const result = scoreFormation({
        placements: { s1: 'carry' },
        heroesById,
        scenario,
        lockedCarryHeroId: '',
      })
      // 空 lockedCarryHeroId 应视为无锁定（guard: != null && !== ''）
      expect(result.carryHeroId).toBe('carry')
      expect(result.objectiveValue.toNumber()).toBeGreaterThan(0)
    })
  })

  describe('空 / 奇异输入', () => {
    it('placements={} → objectiveValue=ZERO、carryHeroId=null、breakdown=null', () => {
      const result = scoreFormation({
        placements: {},
        heroesById: new Map(),
        scenario,
      })
      expect(result.objectiveValue.toNumber()).toBe(0)
      expect(result.carryHeroId).toBeNull()
      expect(result.breakdown).toBeNull()
      expect(result.activeSignalKinds.size).toBe(0)
    })

    it('placements 引用不在 heroesById 的 heroId → 该条目被过滤，不崩溃', () => {
      const carry = createHero('carry', { seat: 1, baseDamage: 10 })
      const result = scoreFormation({
        placements: { s1: 'carry', s2: 'ghost' },
        heroesById: new Map([['carry', carry]]),
        scenario,
      })
      // 'ghost' 不在 heroesById → filtered out, 只有 carry 被评估
      expect(result.carryHeroId).toBe('carry')
    })
  })

  describe('自引用 / 循环不崩溃', () => {
    it('carry 自带 carrySignals（self-buff）→ collectSignals 合并 carry+support，自增益生效', () => {
      // 反例守护：support===carry 时 collectSignals 返回 [...carrySignals, ...supportSignals]。
      // 自增益信号（如 heroDpsMultiplier 无 targetQualifier）须正常计入池。
      const carry = createHero('carry', {
        seat: 1, baseDamage: 10,
        carrySignals: [heroDps(200)], // +200% 自身 DPS
      })
      const heroesById = new Map([['carry', carry]])
      const result = scoreFormation({ placements: { s1: 'carry' }, heroesById, scenario })

      // carryDps = 10 × 1.06 × (1 + 200/100) = 10 × 1.06 × 3 = 31.8
      expect(result.objectiveValue.toNumber()).toBeCloseTo(31.8, 4)
      expect(result.carryHeroId).toBe('carry')
    })

    it('互为支援（A→B + B→A 循环依赖）→ 单遍稳态模型不循环，正常产出', () => {
      // IC 是稳态模型（单遍求值，非迭代收敛），循环依赖 A→B + B→A 不会导致无限递归。
      // 每个 carry 候选独立评估，support 信号一次性聚合。
      const heroA = createHero('a', {
        seat: 1, baseDamage: 10,
        supportSignals: [heroDps(100)], // A 给 carry +100% hero DPS
      })
      const heroB = createHero('b', {
        seat: 2, baseDamage: 5,
        supportSignals: [heroDps(100)], // B 给 carry +100% hero DPS
      })
      const heroesById = new Map([['a', heroA], ['b', heroB]])
      const result = scoreFormation({ placements: { s1: 'a', s2: 'b' }, heroesById, scenario })

      // A 作 carry：baseDps=10×1.06=10.6, hero_dps pool: A 自身无 carry signal + B 给 +100% → pool=2
      //   → carryDps = 10.6 × 2 = 21.2
      // B 作 carry：baseDps=5×1.06=5.3, hero_dps pool: A 给 +100% → pool=2
      //   → carryDps = 5.3 × 2 = 10.6
      // A carryDps(21.2) > B carryDps(10.6) → bestCarry = A
      expect(result.carryHeroId).toBe('a')
      expect(result.objectiveValue.toNumber()).toBeCloseTo(21.2, 4)
      // 不崩溃、不超时、不无限递归
    })
  })

  describe('约束不变量（反单调性）', () => {
    it('carry-dps 模式：从合法阵型移除任一 support → 仍产出有效结果（不崩溃）', () => {
      // 反单调性在 scoreFormation 层的体现：移除英雄不破坏函数契约
      const carry = createHero('carry', { seat: 1, baseDamage: 10 })
      const a = createHero('a', { seat: 2, supportSignals: [globalDps(100)] })
      const b = createHero('b', { seat: 3, supportSignals: [globalDps(200)] })
      const heroesById = new Map([['carry', carry], ['a', a], ['b', b]])

      const full = scoreFormation({ placements: { s1: 'carry', s2: 'a', s3: 'b' }, heroesById, scenario })
      const minusA = scoreFormation({ placements: { s1: 'carry', s3: 'b' }, heroesById, scenario })
      const minusB = scoreFormation({ placements: { s1: 'carry', s2: 'a' }, heroesById, scenario })

      // 全阵型 ≥ 任一子阵型（support 只加分不减分）
      expect(compareGameNumbers(full.objectiveValue, minusA.objectiveValue)).toBeGreaterThanOrEqual(0)
      expect(compareGameNumbers(full.objectiveValue, minusB.objectiveValue)).toBeGreaterThanOrEqual(0)
    })
  })
})
