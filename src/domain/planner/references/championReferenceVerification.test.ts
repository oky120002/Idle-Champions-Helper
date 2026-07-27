// 英雄 DPS 机制参照对照测试。
// 详见 docs/specs/modules/planner/champion-reference-verification.md。
// 三组：对照测试（multiplierChecks）+ 孤儿机制预警 + 关联一致性。
import { describe, expect, it } from 'vitest'

import type { HeroAbilityProfile, HeroAbilitySignal } from '../../abilities/abilityModel'
import type { OfficialPlannerScenarioModel } from '../plannerModel'
import { evaluatePlacementFit } from '../placementFit'
import { vi95ReferenceData } from './vi95ReferenceData'

function createHero(heroId: string, tags: string[], signals: HeroAbilitySignal[] = []): HeroAbilityProfile {
  return {
    heroId,
    name: { original: heroId, display: heroId },
    seat: 1,
    roles: [],
    tags,
    baseAttackDamageTypes: [],
    baseAttackCooldown: null,
    age: null,
    abilityScores: {},
    baseDamage: 1,
    baseHealth: 1,
    carrySignals: signals,
    supportSignals: [],
    unsupportedSignals: [],
    sourceBreakdown: { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
  }
}

const scenario: OfficialPlannerScenarioModel = {
  variantId: 'vi-test',
  scenarioRef: { kind: 'variant', id: 'vi-test' },
  name: { original: 'test', display: 'test' },
  formationLayoutId: 'layout-vi',
  objectiveArea: 193,
  slotTopology: [
    { slotId: 's1', row: 1, column: 1, x: 60, y: 10, adjacentSlotIds: ['s2'] },
    { slotId: 's2', row: 1, column: 2, x: 50, y: 10, adjacentSlotIds: ['s1', 's3'] },
    { slotId: 's3', row: 1, column: 3, x: 40, y: 10, adjacentSlotIds: ['s2', 's4'] },
    { slotId: 's4', row: 1, column: 4, x: 30, y: 10, adjacentSlotIds: ['s3', 's5'] },
    { slotId: 's5', row: 2, column: 2, x: 50, y: 30, adjacentSlotIds: ['s4', 's6'] },
    { slotId: 's6', row: 2, column: 3, x: 40, y: 30, adjacentSlotIds: ['s5', 's7'] },
    { slotId: 's7', row: 2, column: 4, x: 30, y: 30, adjacentSlotIds: ['s6'] },
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

// mock formationCountQualifier tag；归一化修复后蔚 count 限定 = good|acqinc|cteam，测试用 good 代表。
const COUNT_TAG = 'good'

// 蔚 signal（模拟归一化修复后的正确状态：count 限定 good / target 限定 geneutral）。
const viCarrySignals: HeroAbilitySignal[] = [
  {
    kind: 'heroDpsMultiplier',
    value: 300,
    rawEffect: 'hero_dps_multiplier_mult,300',
    source: 'official-parsed',
    amountFunc: 'mult',
    stackFunc: 'per_hero',
    formationCountQualifier: { predicate: { op: 'tag', tag: COUNT_TAG } },
    targetQualifier: { predicate: { op: 'tag', tag: 'geneutral' } },
  },
]

function buildViFormation() {
  const heroes = [
    createHero('95', [COUNT_TAG, 'geneutral'], viCarrySignals),
    ...['mock-good-1', 'mock-good-2', 'mock-good-3', 'mock-good-4', 'mock-good-5', 'mock-good-6'].map(
      id => createHero(id, [COUNT_TAG, 'geneutral']),
    ),
  ]
  const heroesById = new Map(heroes.map(h => [h.heroId, h]))
  const placements: Record<string, string> = {}
  scenario.slotTopology.forEach((slot, i) => {
    placements[slot.slotId] = heroes[i]!.heroId
  })
  return { heroes, heroesById, placements }
}

describe('champion reference verification - 蔚(95)', () => {
  it('善良榜样 formation-count-mult-stack: 4^7 = 16384（7 名 good 英雄，per_hero 计数）', () => {
    const { heroes, heroesById, placements } = buildViFormation()
    const ref = vi95ReferenceData
    const check = ref.expected.multiplierChecks.find(c => c.rawEffect === 'hero_dps_multiplier_mult,300')!

    const fit = evaluatePlacementFit({
      carryHero: heroes[0]!,
      carrySlotId: 's1',
      supportHero: heroes[0]!,
      supportSlotId: 's1',
      scenario,
      placements,
      heroesById,
    })

    const entry = fit.scoreBreakdown.find(r => r.rawEffect === check.rawEffect && r.active)
    expect(entry).toBeDefined()
    expect(entry?.multiplier ?? 0).toBeCloseTo(check.expectedMultiplier, 0)
  })
})

describe.todo('孤儿机制预警（扫 hero-abilities.json 统计每机制实际使用英雄数）', () => {
  // commit 2 完善：扫 public/data/v1/hero-abilities.json，按 dps-mechanics.md 识别规则归类。
})

describe.todo('关联一致性（mechanicId 三处一致：代码注释 / reference / 注册表）', () => {
  // commit 2 完善：reference.mechanicIds 必须在 dps-mechanics.md + scoring 注释存在。
})
