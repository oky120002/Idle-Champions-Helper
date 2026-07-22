import test from 'node:test'
import assert from 'node:assert/strict'

import { championDetailsSchema } from './champion-details-schema.mjs'

const validDetail = {
  attacks: { base: { cooldown: 4, damageTypes: ['melee'] } },
  baseDamage: '1',
  baseHealth: '98',
  costCurves: { '1': 1.06 },
  healthCurves: { '1': 1 },
  characterSheet: { age: 40, abilityScores: { str: 15 } },
  upgrades: [],
}

test('championDetailsSchema 接受合法核心字段（阶段 9.3）', () => {
  assert.equal(championDetailsSchema.safeParse(validDetail).success, true)
})

test('championDetailsSchema 拦截 baseDamage 类型错误', () => {
  const result = championDetailsSchema.safeParse({ ...validDetail, baseDamage: 123 })
  assert.equal(result.success, false)
})

test('championDetailsSchema 拦截 attacks.base.cooldown 缺失', () => {
  const result = championDetailsSchema.safeParse({
    ...validDetail,
    attacks: { base: { damageTypes: ['melee'] } },
  })
  assert.equal(result.success, false)
})

test('characterSheet.age=null 合法（真实数据含 null age）', () => {
  const result = championDetailsSchema.safeParse({
    ...validDetail,
    characterSheet: { age: null, abilityScores: {} },
  })
  assert.equal(result.success, true)
})

test('非核心字段 passthrough 放行（不耦合上游字段增减）', () => {
  const result = championDetailsSchema.safeParse({ ...validDetail, extraField: 'whatever', skins: [] })
  assert.equal(result.success, true)
})
