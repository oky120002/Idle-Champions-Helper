import { Decimal } from 'decimal.js'
import { describe, expect, test } from 'vitest'

import { buildAreaDashboardModel } from './areaDashboard'
import { estimateMaxArea } from './areaEstimation'
import { monsterHealthAt } from './monsterStats'

describe('buildAreaDashboardModel', () => {
  test('把伤害绑定结果转换为伤害墙和对照值', () => {
    const model = buildAreaDashboardModel(estimateMaxArea({ bud: monsterHealthAt(100), effectiveHealth: null }))

    expect(model.wall).toBe('damage')
    expect(model.improvement).toBe('damage')
    expect(model.bud).not.toBe('0')
    expect(model.targetHealth).not.toBe('0')
  })

  test('把 survival 绑定结果转换为生存墙并保留有效生命对照', () => {
    const model = buildAreaDashboardModel(estimateMaxArea({
      bud: monsterHealthAt(500),
      effectiveHealth: new Decimal(1),
    }))

    expect(model.wall).toBe('survival')
    expect(model.improvement).toBe('survival')
    expect(model.effectiveHealth).toBe('1')
    expect(model.targetDamage).not.toBeNull()
  })

  test('机制约束和设计上限有独立分类', () => {
    const mechanic = buildAreaDashboardModel(estimateMaxArea({
      bud: monsterHealthAt(100),
      effectiveHealth: null,
      viability: { armor: { segments: 200 }, hitsBased: null, damageModifier: null, enemyDamageMult: null, healthDrainRate: null },
    }))
    const limit = buildAreaDashboardModel(estimateMaxArea({ bud: new Decimal('1e1000'), effectiveHealth: new Decimal('1e1000') }))

    expect(mechanic.wall).toBe('mechanic')
    expect(limit.wall).toBe('design-limit')
    expect(limit.improvement).toBeNull()
  })
})
