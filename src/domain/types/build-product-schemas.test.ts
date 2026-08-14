import { describe, expect, it } from 'vitest'

import { plannerScenarioItemSchema, scenariosSchema } from './build-product-schemas.ts'

const validScenario = {
  variantId: 'variant-1',
  scenarioRef: { kind: 'variant', id: 'variant-1' },
  name: { original: 'Test Variant', display: '测试变体' },
  formationLayoutId: 'layout-a',
  objectiveArea: 125,
  slotTopology: [{ slotId: 's1', row: 1, column: 1 }],
  forcedHeroes: [],
  enemyTypes: ['undead', 'humanoid'],
  allowedHeroes: [],
  allowedTagExpression: [],
  attributeRequirements: [],
  scenarioWarnings: [{ literal: '当前场景没有匹配的阵型布局。' }],
  occupiedSlotCount: 0,
  viabilityContext: {
    armor: null,
    hitsBased: null,
    damageModifier: null,
    enemyDamageMult: null,
    healthDrainRate: null,
  },
  damageSourcePattern: null,
}

describe('planner scenario build-product schema', () => {
  it('接受 builder 输出且保留 planner 消费的场景字段', () => {
    const result = plannerScenarioItemSchema.safeParse(validScenario)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.scenarioRef).toEqual({ kind: 'variant', id: 'variant-1' })
    expect(result.data.objectiveArea).toBe(125)
    expect(result.data.enemyTypes).toEqual(['undead', 'humanoid'])
    expect(result.data.scenarioWarnings).toEqual([{ literal: '当前场景没有匹配的阵型布局。' }])
  })

  it('要求场景引用、目标区、敌人类型和 warning 保持 builder 契约', () => {
    const invalid = {
      ...validScenario,
      scenarioRef: { kind: 'unknown', id: 'variant-1' },
      objectiveArea: '125',
      enemyTypes: [1],
      scenarioWarnings: [new Error('warning')],
    }

    expect(plannerScenarioItemSchema.safeParse(invalid).success).toBe(false)
  })

  it('允许没有目标区的场景使用 null', () => {
    const result = plannerScenarioItemSchema.safeParse({ ...validScenario, objectiveArea: null })

    expect(result.success).toBe(true)
  })

  it('scenariosSchema 校验带场景字段的真实产物信封', () => {
    const result = scenariosSchema.safeParse({ items: [validScenario], updatedAt: '2026-06-04' })

    expect(result.success).toBe(true)
  })
})
