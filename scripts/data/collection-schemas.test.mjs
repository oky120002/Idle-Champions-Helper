import test from 'node:test'
import assert from 'node:assert/strict'

import {
  adventuresCollectionSchema,
  championsCollectionSchema,
  patronsCollectionSchema,
  variantsCollectionSchema,
} from './collection-schemas.mjs'

const updated = '2026-07-20'

const validChampion = {
  id: '70',
  name: { original: 'Ezmerelda', display: '艾丝美拉达' },
  seat: 1,
  roles: ['support'],
  affiliations: [],
  tags: ['female'],
  patronEligibility: { eligiblePatronIds: ['1'] },
  portrait: { path: 'v1/champion-portraits/70.png' },
}

const validAdventure = {
  id: '1',
  ruleContextId: 'adventure:1',
  scenarioKind: 'adventure',
  name: { original: 'A Brief Tour', display: '王国之旅' },
  campaign: { id: '1', original: 'Sword Coast', display: '剑湾' },
  description: null,
  objectiveArea: 25,
  locationId: '1',
  areaSetId: '1',
  scene: { id: '1:1', original: 'Scene', display: '场景' },
  requirements: [],
  restrictions: [{ original: 'No restrictions', display: '无限制' }],
  rewards: [],
  repeatable: false,
  patronObjectiveTiers: [],
  modeTags: ['adventure'],
  mechanics: ['skip_cinematics'],
}

const validVariant = {
  id: '4',
  ruleContextId: 'variant:4',
  scenarioKind: 'variant',
  name: { original: 'Are Ya Chicken?', display: '你是小鸡吗？' },
  campaign: { id: '1', original: 'Sword Coast', display: '剑湾' },
  adventureId: '3',
  adventure: { original: 'The Cursed Farmer', display: '被诅咒的农夫' },
  objectiveArea: 75,
  locationId: '2',
  areaSetId: '5',
  scene: { id: '1:2', original: 'Scene', display: '场景' },
  restrictions: [],
  rewards: [],
  repeatable: false,
}

const validPatron = {
  id: '1',
  name: { original: 'Mirt', display: '米尔特' },
  description: { original: 'desc', display: '描述' },
  shortName: 'Mirt',
  restrictionsText: [],
  minObjectiveLevel: 250,
  defaultObjectiveBump: 100,
  weeklyFreePlayCap: 5000,
  forceAllowedHeroIds: [],
  eligibilityRules: [{ type: 'tags', supported: true }],
  evaluationStatus: 'complete',
}

test('championsCollectionSchema 接受合法 collection', () => {
  const result = championsCollectionSchema.safeParse({ items: [validChampion], updatedAt: updated })
  assert.equal(result.success, true)
})

test('championsCollectionSchema 拦截 seat 类型错误', () => {
  const result = championsCollectionSchema.safeParse({
    items: [{ ...validChampion, seat: '1' }],
    updatedAt: updated,
  })
  assert.equal(result.success, false)
})

test('championsCollectionSchema 拦截 items 非数组', () => {
  const result = championsCollectionSchema.safeParse({ items: {}, updatedAt: updated })
  assert.equal(result.success, false)
})

test('championsCollectionSchema 拦截 updatedAt 缺失', () => {
  const result = championsCollectionSchema.safeParse({ items: [validChampion] })
  assert.equal(result.success, false)
})

test('championsCollectionSchema 拦截 name 缺失（核心字段必填）', () => {
  const { name, ...withoutName } = validChampion
  const result = championsCollectionSchema.safeParse({ items: [withoutName], updatedAt: updated })
  assert.equal(name, name) // 防 unused 警告
  assert.equal(result.success, false)
})

test('adventuresCollectionSchema 接受合法 collection', () => {
  const result = adventuresCollectionSchema.safeParse({ items: [validAdventure], updatedAt: updated })
  assert.equal(result.success, true)
})

test('adventuresCollectionSchema 拦截 scenarioKind 非 adventure', () => {
  const result = adventuresCollectionSchema.safeParse({
    items: [{ ...validAdventure, scenarioKind: 'variant' }],
    updatedAt: updated,
  })
  assert.equal(result.success, false)
})

test('adventuresCollectionSchema 拦截 objectiveArea 类型错误', () => {
  const result = adventuresCollectionSchema.safeParse({
    items: [{ ...validAdventure, objectiveArea: '25' }],
    updatedAt: updated,
  })
  assert.equal(result.success, false)
})

test('variantsCollectionSchema 接受合法 collection', () => {
  const result = variantsCollectionSchema.safeParse({ items: [validVariant], updatedAt: updated })
  assert.equal(result.success, true)
})

test('variantsCollectionSchema 接受 nullable 字段为 null', () => {
  const result = variantsCollectionSchema.safeParse({
    items: [{
      ...validVariant,
      adventureId: null,
      adventure: null,
      scene: null,
      objectiveArea: null,
    }],
    updatedAt: updated,
  })
  assert.equal(result.success, true)
})

test('variantsCollectionSchema 拦截 restrictions 非 LocalizedText 数组', () => {
  const result = variantsCollectionSchema.safeParse({
    items: [{ ...validVariant, restrictions: [{ original: 'x' }] }],
    updatedAt: updated,
  })
  assert.equal(result.success, false)
})

test('patronsCollectionSchema 接受合法 collection', () => {
  const result = patronsCollectionSchema.safeParse({ items: [validPatron], updatedAt: updated })
  assert.equal(result.success, true)
})

test('patronsCollectionSchema 拦截 evaluationStatus 非法枚举', () => {
  const result = patronsCollectionSchema.safeParse({
    items: [{ ...validPatron, evaluationStatus: 'unknown' }],
    updatedAt: updated,
  })
  assert.equal(result.success, false)
})

test('patronsCollectionSchema 拦截 eligibilityRules 缺 supported', () => {
  const result = patronsCollectionSchema.safeParse({
    items: [{ ...validPatron, eligibilityRules: [{ type: 'tags' }] }],
    updatedAt: updated,
  })
  assert.equal(result.success, false)
})

test('非核心字段 passthrough 放行（不耦合上游字段增减）', () => {
  const result = championsCollectionSchema.safeParse({
    items: [{ ...validChampion, extraField: 'whatever', newCoreFlag: true }],
    updatedAt: updated,
  })
  assert.equal(result.success, true)
})
