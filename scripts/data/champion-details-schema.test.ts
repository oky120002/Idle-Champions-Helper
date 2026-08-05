import { it, expect } from 'vitest'

import { championDetailsSchema } from './champion-details-schema.ts'

const validDetail = {
  attacks: { base: { cooldown: 4, damageTypes: ['melee'] } },
  baseDamage: '1',
  baseHealth: '98',
  costCurves: { '1': 1.06 },
  healthCurves: { '1': 1 },
  characterSheet: { age: 40, abilityScores: { str: 15 } },
  upgrades: [],
}

it('championDetailsSchema 接受合法核心字段', () => expect(championDetailsSchema.safeParse(validDetail).success).toBe(true))

it('championDetailsSchema 拦截 baseDamage 类型错误', () => {
  const result = championDetailsSchema.safeParse({ ...validDetail, baseDamage: 123 })
  expect(result.success).toBe(false)
})

it('championDetailsSchema 拦截 attacks.base.cooldown 缺失', () => {
  const result = championDetailsSchema.safeParse({
    ...validDetail,
    attacks: { base: { damageTypes: ['melee'] } },
  })
  expect(result.success).toBe(false)
})

it('characterSheet.age=null 合法（真实数据含 null age）', () => {
  const result = championDetailsSchema.safeParse({
    ...validDetail,
    characterSheet: { age: null, abilityScores: {} },
  })
  expect(result.success).toBe(true)
})

it('非核心字段 passthrough 放行（不耦合上游字段增减）', () => {
  const result = championDetailsSchema.safeParse({ ...validDetail, extraField: 'whatever', skins: [] })
  expect(result.success).toBe(true)
})
