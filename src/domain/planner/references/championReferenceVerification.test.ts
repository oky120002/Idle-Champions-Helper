// 英雄 DPS 机制参照对照测试。
// 详见 docs/specs/modules/planner/champion-reference-verification.md。
// 三组：对照测试（multiplierChecks）+ 抽象阈值守护（注册表规模 / stackFunc 通用化）+ 关联一致性。
import { readFileSync } from 'node:fs'
import path from 'node:path'

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

// 蔚"善良榜样"signal（归一化修复后正确状态：count 限定 good / target 限定 geneutral）。
const viGoodExampleSignal: HeroAbilitySignal = {
  kind: 'heroDpsMultiplier',
  value: 300,
  rawEffect: 'hero_dps_multiplier_mult,300',
  source: 'official-parsed',
  amountFunc: 'mult',
  stackFunc: 'per_hero',
  formationCountQualifier: { predicate: { op: 'tag', tag: COUNT_TAG } },
  targetQualifier: { predicate: { op: 'tag', tag: 'geneutral' } },
}

// 蔚"出言不逊永不够"signal：dynamic-stack-multiply，bonus-scale-linkage 挂在善良榜样上。
// 层数来自 stackMaxExpr（highest_available_area*10），归一化降 unsupported，测试用 manualStackCount 提供。
const viSassSignal: HeroAbilitySignal = {
  kind: 'heroDpsMultiplier',
  value: 0.33,
  rawEffect: 'buff_upgrade,0.33,12312',
  source: 'official-parsed',
  stacksMultiply: true,
  bonusScaleOfSignal: viGoodExampleSignal,
}

const viCarrySignals: HeroAbilitySignal[] = [viGoodExampleSignal, viSassSignal]

// 机制对照容差：游戏显示值（如 0.33%/层）为取整近似，逐项对照用 30% 相对偏差（与校准口径一致）。
const TOLERANCE = 0.30
function expectWithinTolerance(actual: number, expected: number, tolerance: number): void {
  const deviation = Math.abs(actual - expected) / expected
  expect(deviation).toBeLessThanOrEqual(tolerance)
}

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

  it('出言不逊 dynamic-stack-multiply: 1.0033^1930 ≈ 576（bonus-scale-linkage 依赖善良榜样可计分）', () => {
    const { heroes, heroesById, placements } = buildViFormation()
    const ref = vi95ReferenceData
    const check = ref.expected.multiplierChecks.find(c => c.rawEffect === 'buff_upgrade,0.33,12312')!

    const fit = evaluatePlacementFit({
      carryHero: heroes[0]!,
      carrySlotId: 's1',
      supportHero: heroes[0]!,
      supportSlotId: 's1',
      scenario,
      placements,
      heroesById,
      manualStackCount: ref.expected.manualStackCount,
    })

    const entry = fit.scoreBreakdown.find(r => r.rawEffect === check.rawEffect && r.active)
    expect(entry).toBeDefined()
    // 1.0033^1930 ≈ 577（0.33%/层 是游戏取整显示，实际略低；30% 容差内对照）
    expectWithinTolerance(entry?.multiplier ?? 0, check.expectedMultiplier, TOLERANCE)
  })
})

describe('抽象阈值守护（dps-mechanic-abstraction.md）', () => {
  // 注册表 id：解析 dps-mechanics.md 注册表首列。
  const registryPath = path.resolve(__dirname, '../../../../docs/specs/modules/planner/dps-mechanics.md')
  const registry = readFileSync(registryPath, 'utf8')
  const registryIds = new Set(
    [...registry.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]!),
  )

  it('注册表机制数 ≤ 10（>10 触发策略注册表升级，见 dps-mechanic-abstraction.md）', () => {
    expect(registryIds.size).toBeLessThanOrEqual(10)
  })
})

describe('关联一致性（mechanicId 三处一致）', () => {
  const registryPath = path.resolve(__dirname, '../../../../docs/specs/modules/planner/dps-mechanics.md')
  const registryIds = new Set(
    [...readFileSync(registryPath, 'utf8').matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]!),
  )

  it('reference 的 mechanicIds 必须在注册表', () => {
    const refs = [vi95ReferenceData]
    const unknown: string[] = []
    for (const ref of refs) {
      for (const ability of ref.abilities) {
        for (const id of ability.mechanicIds) {
          if (!registryIds.has(id)) unknown.push(`${ref.heroId}/${ability.nameZh}: ${id}`)
        }
      }
    }
    expect(unknown, `reference 出现未注册的 mechanicId：${unknown.join(', ')}`).toEqual([])
  })
})
