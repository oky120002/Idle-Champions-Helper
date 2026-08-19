/**
 * 全英雄评估 smoke：每个英雄作为自 carry 跑一次 scoreFormation，
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
import { unwrap } from '../../tests/utils/dom-assertions.ts'

const DATA_DIR = path.resolve('public/data/v1')

interface DataCollection<T> {
  items: T[]
  updatedAt: string
}

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8'))
}

function loadCollections() {
  const heroesRaw = loadJson('hero-abilities') as DataCollection<HeroAbilityProfile>
  const scenariosRaw = loadJson('scenarios') as DataCollection<OfficialPlannerScenarioModel>
  const resolved = resolvePlannerModel(heroesRaw.items, scenariosRaw.items, [], [])
  return { heroes: resolved.heroes, scenarios: resolved.scenarios }
}

describe('全英雄评估 smoke', () => {
  it('每个英雄自 carry 跑 scoreFormation 不崩溃', () => {
    const { heroes, scenarios } = loadCollections()
    expect(heroes.length).toBeGreaterThan(0)
    const scenario = unwrap(scenarios[0], '期望至少一个 scenario')
    const slotId = unwrap(scenario.slotTopology[0], '期望 scenario 至少一个 slot').slotId

    const failures: string[] = []
    for (const hero of heroes) {
      const heroesById = new Map([[hero.heroId, hero]])
      try {
        const result = scoreFormation({
          placements: { [slotId]: hero.heroId },
          heroesById,
          scenario,
        })
        // 结果有 objectiveValue 即视为可用；不验数值，但须为正数（非 NaN/0/负）。
        // toBeDefined 放过退化值（如评估 bug 产生 NaN），加正数检查捕获静默错误。
        expect(result.objectiveValue.toNumber()).toBeGreaterThan(0)
      } catch (error) {
        failures.push(`${hero.heroId}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('蔚(95) 善良榜样 signal 在 built 数据中 count/target 分离正确（normalize→build 产物守护）', () => {
    // 数据归一化质量守护：built hero-abilities.json 须反映 937e68c4 count/target 分离修复——
    // 善良榜样 count 来自 stack_func_data.tag（good|acqinc|cteam → OR），target 来自 filter_targets（geneutral）。
    // 旧 bug：filter_targets 被误作 formationCountQualifier、targetQualifier=null（既数错又 buff 错目标）。
    // 此测试防 stale build 回退到旧 buggy 产物。
    const { heroes } = loadCollections()
    const vi = heroes.find((h) => h.heroId === '95')
    expect(vi).toBeDefined()
    const viHero = unwrap(vi, '期望找到 heroId=95 的蔚')
    const goodExample = viHero.supportSignals.find(
      (s) => s.rawEffect === 'hero_dps_multiplier_mult,300' && s.formationCountQualifier != null,
    )
    expect(goodExample).toBeDefined()
    const goodExampleSignal = unwrap(goodExample, '期望找到善良榜样 signal')
    // count 限定 = OR(good, acqinc, cteam)；target = geneutral（修复前 target 为 null、count 被误作 geneutral）
    expect(goodExampleSignal.formationCountQualifier?.predicate).toMatchObject({
      op: 'or',
      children: [
        { op: 'tag', tag: 'good' },
        { op: 'tag', tag: 'acqinc' },
        { op: 'tag', tag: 'cteam' },
      ],
    })
    expect(goodExampleSignal.targetQualifier?.predicate).toEqual({ op: 'tag', tag: 'geneutral' })
  })

  it('ability 源静态 buff_upgrade 不进 built signals（贡献已在 effect_def snapshot）；动态/外部源保留', () => {
    // 审计根因（2026-07-28）：IC effect_def effect_string 是满级 snapshot 计算值，已含 ability 自身 upgrade 树
    // 的全部静态 buff_upgrade 贡献。蔚证：善良榜样 effect_string=300 含 20 条 ranked buff_upgrade,100,12312
    //（upgrade effectReference 进阶节点）+ 劝人向善 buff_upgrade,200,12312（effect_keys 静态修饰）；
    // 游戏显示 per-stack 恰好 +300%（4^7=16384），叠层系数 2.92e7=4^7×576×1.2×2.578 只含 2 个外部修饰器
    // （道德规范专长 / 时髦披肩装备）。旧代码假设「真升级全部叠加」、每条独立 +base.value×X/100 addPercent
    // → 蔚 damage:hero pool 6.4e8 vs 游戏 2.92e7（22× 高估），影响 162/164 英雄。
    // 保留三类运行时修饰：动态 stacks_multiply（出言不逊）、复杂 wrapper（阵型依赖）、外部源 loot/feat。
    const { heroes } = loadCollections()
    const vi = heroes.find((h) => h.heroId === '95')
    expect(vi).toBeDefined()
    const viHero = unwrap(vi, '期望找到 heroId=95 的蔚')
    // ability 源静态 plain buff_upgrade 须消除：
    expect(
      viHero.supportSignals.filter((s) => s.rawEffect === 'buff_upgrade,100,12312'),
      'upgrade effectReference ranked 进阶（20 条）不应进 built signals',
    ).toHaveLength(0)
    expect(
      viHero.supportSignals.filter((s) => s.rawEffect === 'buff_upgrade,200,12312'),
      'effect_keys 静态修饰（劝人向善 +200%，已烘进 300）不应进 built signals',
    ).toHaveLength(0)
    // 运行时修饰器须保留：
    const sass = viHero.supportSignals.find((s) => s.rawEffect === 'buff_upgrade,0.33,12312')
    expect(sass, '出言不逊（effect_keys stacks_multiply 动态）须保留').toBeDefined()
    expect(sass?.stacksMultiply).toBe(true)
    // 装备源（loot）buff_upgrade 不进 base scored profile——加成源唯一性不变式
    // （见 simulator.md + modeling-pitfalls.md）：装备只走 owned-aware 通道（equipmentMult.ts），
    // build 管线 bake 装备源会与 owned 通道双重计数。时髦披肩（loot buff_upgrade,275,12312）不进。
    expect(
      viHero.supportSignals.filter((s) => s.rawEffect === 'buff_upgrade,275,12312'),
      '时髦披肩（loot 外部源装备）不进 scored profile（owned-aware 通道负责）',
    ).toHaveLength(0)
    expect(viHero.supportSignals.filter((s) => s.rawEffect === 'buff_upgrade,25,12312')).toHaveLength(0)
  })
})
