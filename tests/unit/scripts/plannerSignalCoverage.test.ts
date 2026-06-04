import { describe, expect, it } from 'vitest'

import { generatePlannerSignalCoverageReport } from '../../../scripts/data/planner-signal-coverage.mjs'

describe('planner signal coverage report', () => {
  it('统计已识别 signal、叠层组合和 unsupported effect', () => {
    const report = generatePlannerSignalCoverageReport([
      {
        upgrades: [
          {
            effectReference: 'global_dps_multiplier_mult,100',
            amount_func: 'add',
            stack_func: 'per_crusader',
            target_filters: [{ type: 'by_tags', tags: 'female' }],
          },
          {
            effectReference: 'mystery_effect,5',
          },
        ],
        loot: [],
        legendaryEffects: [],
      },
    ])

    expect(report.totals.totalHeroes).toBe(1)
    expect(report.totals.totalEffectEntries).toBe(2)
    expect(report.totals.recognizedSignals).toBe(1)
    expect(report.totals.unsupportedSignals).toBe(1)
    expect(report.stackFunctions.find((entry) => entry.key === 'per_crusader')?.count).toBe(1)
    expect(report.amountStackCombos.find((entry) => entry.key === 'per_crusader__add')?.count).toBe(1)
    expect(report.topUnsupportedEffectNames[0]).toEqual({ key: 'mystery_effect', count: 1 })
  })

  it('区分可计分、手动触发和未覆盖组合', () => {
    const report = generatePlannerSignalCoverageReport([
      {
        upgrades: [
          {
            effectReference: 'global_dps_multiplier_mult,20',
            amount_func: 'mult',
            stack_func: 'per_hero_attribute',
            per_hero_expr: 'GetStat(`STR`) >= 15',
          },
          {
            effectReference: 'global_dps_multiplier_mult,20',
            amount_func: 'mult',
            stack_func: 'per_unknown_stack',
          },
          {
            effectReference: 'global_dps_multiplier_mult,20',
            apply_manually: true,
          },
        ],
        loot: [],
        legendaryEffects: [],
      },
    ])

    expect(report.scoringSupport.find((entry) => entry.key === 'supported')?.count).toBe(1)
    expect(report.scoringSupport.find((entry) => entry.key === 'unsupported-composition')?.count).toBe(1)
    expect(report.scoringSupport.find((entry) => entry.key === 'manual')?.count).toBe(1)
    expect(report.totals.perHeroExprTotal).toBe(1)
    expect(report.totals.parsedPerHeroExprTotal).toBe(1)
    expect(report.totals.signalsWithStatCountQualifier).toBe(1)
  })

  it('保留未解析 per_hero_expr 以便后续排优先级', () => {
    const report = generatePlannerSignalCoverageReport([
      {
        upgrades: [
          {
            effectReference: 'global_dps_multiplier_mult,20',
            amount_func: 'mult',
            stack_func: 'per_hero_attribute',
            per_hero_expr: 'HasTag(`female`) && GetStat(`STR`) >= 15',
          },
        ],
        loot: [],
        legendaryEffects: [],
      },
    ])

    expect(report.totals.perHeroExprTotal).toBe(1)
    expect(report.totals.unparsedPerHeroExprTotal).toBe(1)
    expect(report.topUnparsedPerHeroExpr[0]).toEqual({
      key: 'HasTag(`female`) && GetStat(`STR`) >= 15',
      count: 1,
    })
  })

  it('把 is_undead 计入已解析表达式，但继续保留 HasEffect 否定表达式为未解析', () => {
    const report = generatePlannerSignalCoverageReport([
      {
        upgrades: [
          {
            effectReference: 'global_dps_multiplier_mult,20',
            amount_func: 'mult',
            stack_func: 'per_hero_attribute',
            per_hero_expr: 'is_undead',
          },
          {
            effectReference: 'global_dps_multiplier_mult,20',
            amount_func: 'mult',
            stack_func: 'per_hero_attribute',
            per_hero_expr: '!HasEffect(`vampire_spawn`)',
          },
        ],
        loot: [],
        legendaryEffects: [],
      },
    ])

    expect(report.totals.perHeroExprTotal).toBe(2)
    expect(report.totals.parsedPerHeroExprTotal).toBe(1)
    expect(report.totals.unparsedPerHeroExprTotal).toBe(1)
    expect(report.totals.signalsWithTagCountQualifier).toBe(1)
    expect(report.topUnparsedPerHeroExpr[0]).toEqual({
      key: '!HasEffect(`vampire_spawn`)',
      count: 1,
    })
  })
})
