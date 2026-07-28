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
        // 结果有 objectiveValue 即视为可用；不验数值，但须为正数（非 NaN/0/负）。
        // toBeDefined 放过退化值（如评分 bug 产生 NaN），加正数检查捕获静默错误。
        expect(result.objectiveValue.toNumber()).toBeGreaterThan(0)
      } catch {
        crashed += 1
      }
    }
    expect(crashed, `${crashed} 个英雄评分崩溃`).toBe(0)
  })

  it('蔚(95) 善良榜样 signal 在 built 数据中 count/target 分离正确（normalize→build 产物守护）', () => {
    // 数据归一化质量守护：built hero-abilities.json 须反映 937e68c4 count/target 分离修复——
    // 善良榜样 count 来自 stack_func_data.tag（good|acqinc|cteam → OR），target 来自 filter_targets（geneutral）。
    // 旧 bug：filter_targets 被误作 formationCountQualifier、targetQualifier=null（既数错又 buff 错目标）。
    // 此测试防 stale build 回退到旧 buggy 产物。
    const { heroes } = loadCollections()
    const vi = heroes.find((h) => h.heroId === '95')
    expect(vi).toBeDefined()
    const goodExample = vi!.supportSignals.find(
      (s) => s.rawEffect === 'hero_dps_multiplier_mult,300' && s.formationCountQualifier,
    )
    expect(goodExample).toBeDefined()
    // count 限定 = OR(good, acqinc, cteam)；target = geneutral（修复前 target 为 null、count 被误作 geneutral）
    expect(goodExample!.formationCountQualifier?.predicate).toMatchObject({
      op: 'or',
      children: [
        { op: 'tag', tag: 'good' },
        { op: 'tag', tag: 'acqinc' },
        { op: 'tag', tag: 'cteam' },
      ],
    })
    expect(goodExample!.targetQualifier?.predicate).toEqual({ op: 'tag', tag: 'geneutral' })
  })
})
