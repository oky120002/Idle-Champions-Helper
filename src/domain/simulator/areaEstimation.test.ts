import { Decimal } from 'decimal.js'
import { describe, expect, test } from 'vitest'

import { estimateMaxArea } from './areaEstimation'
import { monsterHealthAt } from './monsterStats'

describe('estimateMaxArea', () => {
  test('高 BUD 阵型预估层数 > 低 BUD', () => {
    const low = estimateMaxArea({ bud: monsterHealthAt(50), effectiveHealth: null })
    const high = estimateMaxArea({ bud: monsterHealthAt(100), effectiveHealth: null })
    expect(high.area).toBeGreaterThan(low.area)
  })

  test('BUD = monsterHealthAt(N) 时预估可推到 ≥ N', () => {
    // BUD 恰好等于某层怪物生命 → 该层可击杀（one-shot BUD ≥ HP）
    const result = estimateMaxArea({ bud: monsterHealthAt(75), effectiveHealth: null })
    expect(result.area).toBeGreaterThanOrEqual(75)
  })

  test('survival 不足时受限（effectiveHealth < monsterDps 限制层数）', () => {
    // 高 BUD 但 effectiveHealth 极低 → survival 约束绑定
    const highBudLowSurvival = estimateMaxArea({
      bud: monsterHealthAt(500),
      effectiveHealth: new Decimal(1),
    })
    const noSurvivalLimit = estimateMaxArea({
      bud: monsterHealthAt(500),
      effectiveHealth: null,
    })
    expect(highBudLowSurvival.area).toBeLessThan(noSurvivalLimit.area)
    expect(highBudLowSurvival.boundBy).toBe('survival')
  })

  test('survival 充足时由 BUD 绑定', () => {
    const result = estimateMaxArea({
      bud: monsterHealthAt(100),
      effectiveHealth: new Decimal(1e30),
    })
    expect(result.boundBy).toBe('bud')
  })

  test('预估层数不超过 MAX_AREA', () => {
    const result = estimateMaxArea({
      bud: new Decimal('1e1000'),
      effectiveHealth: new Decimal('1e1000'),
    })
    expect(result.area).toBeLessThanOrEqual(2501)
  })

  test('BUD 为 0 时预估层数 1（area 1 怪物生命 10 > 0）', () => {
    const result = estimateMaxArea({ bud: new Decimal(0), effectiveHealth: null })
    expect(result.area).toBe(1)
  })
})

describe('estimateMaxArea — 护甲感知', () => {
  test('护甲约束降低 killableArea（同 BUD，有护甲 < 无护甲）', () => {
    const bud = monsterHealthAt(100)
    const noArmor = estimateMaxArea({ bud, effectiveHealth: null })
    const withArmor = estimateMaxArea({
      bud,
      effectiveHealth: null,
      viability: { armor: { segments: 50 }, damageModifier: null, enemyDamageMult: null },
    })
    expect(withArmor.killableArea).toBeLessThan(noArmor.killableArea)
    expect(withArmor.boundBy).toBe('armor')
  })

  test('段数递增：segmentsAt 随层数线性增长，门槛仍单调递增', () => {
    const bud = monsterHealthAt(200)
    const result = estimateMaxArea({
      bud,
      effectiveHealth: null,
      viability: {
        armor: { segments: 4, scaling: { additional: 4, everyAreas: 25 } },
        damageModifier: null,
        enemyDamageMult: null,
      },
    })
    // 段数递增不改变单调性：结果仍是合法面积
    expect(result.area).toBeGreaterThanOrEqual(1)
    expect(result.killableArea).toBeLessThanOrEqual(200)
  })

  test('高段数护甲比低段数更严格（killableArea 更低）', () => {
    const bud = monsterHealthAt(100)
    const lowSegments = estimateMaxArea({
      bud,
      effectiveHealth: null,
      viability: { armor: { segments: 10 }, damageModifier: null, enemyDamageMult: null },
    })
    const highSegments = estimateMaxArea({
      bud,
      effectiveHealth: null,
      viability: { armor: { segments: 200 }, damageModifier: null, enemyDamageMult: null },
    })
    expect(highSegments.killableArea).toBeLessThan(lowSegments.killableArea)
  })

  test('damageModifier 降低有效 BUD（0.5 修正 → killableArea 减半量级）', () => {
    const bud = monsterHealthAt(100)
    const noMod = estimateMaxArea({ bud, effectiveHealth: null })
    const halfMod = estimateMaxArea({
      bud,
      effectiveHealth: null,
      viability: { armor: null, damageModifier: 0.5, enemyDamageMult: null },
    })
    expect(halfMod.killableArea).toBeLessThan(noMod.killableArea)
  })

  test('enemyDamageMult 降低 survivableArea', () => {
    // 选 effectiveHealth=10：monsterDpsAt(201)≈9.4 < 10, monsterDpsAt(251)≈16 > 10 → base ≈ 201
    // ×3 后 monsterDpsAt(201)≈28 > 10 → 提前卡住
    const bud = new Decimal('1e100')
    const effectiveHealth = new Decimal(10)
    const noMult = estimateMaxArea({ bud, effectiveHealth })
    const tripleMult = estimateMaxArea({
      bud,
      effectiveHealth,
      viability: { armor: null, damageModifier: null, enemyDamageMult: 3 },
    })
    expect(tripleMult.survivableArea).toBeLessThan(noMult.survivableArea)
  })

  test('普通变体 viability=null 行为与省略一致', () => {
    const bud = monsterHealthAt(100)
    const explicit = estimateMaxArea({ bud, effectiveHealth: null, viability: null })
    const omitted = estimateMaxArea({ bud, effectiveHealth: null })
    expect(explicit).toEqual(omitted)
  })
})
