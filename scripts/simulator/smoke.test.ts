/**
 * 全英雄评分 smoke：每个英雄作为自 carry 跑一次 scoreFormation，
 * 验证所有英雄的 signal 组合不崩溃引擎（归一化/机制改动后的兜底）。
 * 不验数值正确性（数值由 championReferenceVerification 对照），只验可用性。
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { HeroAbilityProfile } from '../../src/domain/abilities/abilityModel.ts'
import type { OfficialPlannerScenarioModel } from '../../src/domain/planner/plannerModel.ts'
import { resolvePlannerModel } from '../../src/domain/planner/plannerModel.ts'
import { scoreFormation } from '../../src/domain/planner/steadyStateScoring.ts'

const DATA_DIR = path.resolve('public/data/v1')

interface DataCollection<T> {
  items: T[]
  updatedAt: string
}

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8')) as T
}

function loadCollections() {
  const heroesRaw = loadJson<DataCollection<HeroAbilityProfile>>('hero-abilities')
  const scenariosRaw = loadJson<DataCollection<OfficialPlannerScenarioModel>>('scenarios')
  const resolved = resolvePlannerModel(heroesRaw.items, scenariosRaw.items, [], [])
  return { heroes: resolved.heroes, scenarios: resolved.scenarios }
}

describe('全英雄评分 smoke', () => {
  it('每个英雄自 carry 跑 scoreFormation 不崩溃', () => {
    const { heroes, scenarios } = loadCollections()
    expect(heroes.length).toBeGreaterThan(0)
    const scenario = scenarios[0]!
    const slotId = scenario.slotTopology[0]!.slotId

    let crashed = 0
    for (const hero of heroes) {
      const heroesById = new Map([[hero.heroId, hero]])
      try {
        const result = scoreFormation({
          placements: { [slotId]: hero.heroId },
          heroesById,
          scenario,
        })
        // 结果有 objectiveValue 即视为可用；不验数值。
        expect(result.objectiveValue).toBeDefined()
      } catch {
        crashed += 1
      }
    }
    expect(crashed, `${crashed} 个英雄评分崩溃`).toBe(0)
  })
})
