import { describe, expect, it } from 'vitest'

import { generateSignalCoverageReport } from './signal-coverage.ts'

describe('signal coverage report', () => {
  it('统计已识别 signal、叠层组合和 unsupported effect', () => {
    const report = generateSignalCoverageReport([
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
          {
            effectReference: 'effect_def,wrapper',
            effectDefinition: {
              snapshots: {
                original: {
                  effect_keys: [
                    { effect_string: 'pre_stack_amount,25' },
                    {
                      effect_string: 'buff_upgrade_per_any_crusader_where_mult,0,1001,int,>=,15',
                      amount_expr: 'upgrade_amount(1002,0)',
                    },
                  ],
                },
              },
            },
          },
          {
            id: '1001',
            effectReference: 'effect_def,base-where',
            effectDefinition: {
              snapshots: {
                original: {
                  effect_keys: [
                    {
                      effect_string: 'hero_dps_multiplier_mult,60',
                      targets: ['all'],
                      filter_targets: [{ type: 'attack_type', attack: 'magic' }],
                    },
                  ],
                },
              },
            },
          },
          {
            id: '1003',
            effectReference: 'effect_def,base-distance',
            effectDefinition: {
              snapshots: {
                original: {
                  effect_keys: [
                    { effect_string: 'pre_stack_amount,100' },
                    {
                      effect_string: 'hero_dps_multiplier_mult,0',
                      amount_expr: 'upgrade_amount(1003,0)',
                      targets: ['non_adj'],
                      amount_func: 'mult',
                      stack_func: 'per_upgrade_targets',
                    },
                  ],
                },
              },
            },
          },
          {
            id: '1004',
            effectReference: 'effect_def,buff-distance',
            effectDefinition: {
              snapshots: {
                original: {
                  effect_keys: [
                    {
                      effect_string: 'buff_upgrade_mult_by_distance_from_source_mult,400,1003',
                      targets: ['non_adj'],
                    },
                  ],
                },
              },
            },
          },
        ],
        loot: [],
        legendaryEffects: [],
      },
    ])

    expect(report.totals.totalHeroes).toBe(1)
    expect(report.totals.totalEffectEntries).toBe(14)
    expect(report.totals.recognizedSignals).toBe(5)
    expect(report.totals.unsupportedSignals).toBe(3)
    expect(report.stackFunctions.find((entry) => entry.key === 'per_crusader')?.count).toBe(2)
    expect(report.amountStackCombos.find((entry) => entry.key === 'per_crusader__add')?.count).toBe(1)
    expect(report.amountStackCombos.find((entry) => entry.key === 'per_crusader__mult')?.count).toBe(1)
    expect(report.stackFunctions.find((entry) => entry.key === 'per_slot_distance_from_source')?.count).toBe(1)
    expect(report.amountStackCombos.find((entry) => entry.key === 'per_slot_distance_from_source__mult')?.count).toBe(1)
    expect(report.topUnsupportedEffectNames[0]).toEqual({ key: 'pre_stack_amount', count: 2 })
    expect(report.topUnsupportedEffectNames[1]).toEqual({ key: 'mystery_effect', count: 1 })
  })

  it('区分可计入目标值、手动触发和未覆盖组合', () => {
    const report = generateSignalCoverageReport([
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

  it('placementFit 已支持的 per_target_crusader / per_col_behind 计为 supported（而非 unsupported-composition）', () => {
    const report = generateSignalCoverageReport([
      {
        upgrades: [
          {
            effectReference: 'hero_dps_mult_per_target_crusader,100,adj',
            amount_func: 'add',
            stack_func: 'per_target_crusader',
          },
          {
            effectReference: 'hero_dps_mult_per_col_behind,100',
            amount_func: 'mult',
            stack_func: 'per_col_behind',
          },
        ],
        loot: [],
        legendaryEffects: [],
      },
    ])

    expect(report.scoringSupport.find((entry) => entry.key === 'supported')?.count).toBe(2)
    expect(report.scoringSupport.find((entry) => entry.key === 'unsupported-composition')?.count).toBeUndefined()
  })

  it('简单 tag && stat 组合进入已解析子集', () => {
    const report = generateSignalCoverageReport([
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
    expect(report.totals.parsedPerHeroExprTotal).toBe(1)
    expect(report.totals.signalsWithTagCountQualifier).toBe(1)
    expect(report.totals.signalsWithStatCountQualifier).toBe(1)
    expect(report.topUnparsedPerHeroExpr).toEqual([])
  })

  it('复杂包装公式仍保留未解析以便后续排优先级', () => {
    const report = generateSignalCoverageReport([
      {
        upgrades: [
          {
            effectReference: 'global_dps_multiplier_mult,20',
            amount_func: 'mult',
            stack_func: 'per_hero_attribute',
            per_hero_expr: 'floor(max(has_tag_acqinc,has_tag_cteam)*min(hero_level,hero_softcap+max_levels_past_soft_cap))',
          },
        ],
        loot: [],
        legendaryEffects: [],
      },
    ])

    expect(report.totals.perHeroExprTotal).toBe(1)
    expect(report.totals.unparsedPerHeroExprTotal).toBe(1)
    expect(report.topUnparsedPerHeroExpr[0]).toEqual({
      key: 'floor(max(has_tag_acqinc,has_tag_cteam)*min(hero_level,hero_softcap+max_levels_past_soft_cap))',
      count: 1,
    })
  })

  it('把 is_undead 计入已解析表达式，但继续保留 HasEffect 否定表达式为未解析', () => {
    const report = generateSignalCoverageReport([
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

  it('把简单 as_int 标签包装计入已解析，但动态阈值公式仍保持未解析', () => {
    const report = generateSignalCoverageReport([
      {
        upgrades: [
          {
            effectReference: 'global_dps_multiplier_mult,20',
            amount_func: 'mult',
            stack_func: 'per_hero_attribute',
            per_hero_expr: '!HasTag(`human`)',
          },
          {
            effectReference: 'global_dps_multiplier_mult,20',
            amount_func: 'mult',
            stack_func: 'per_hero_attribute',
            per_hero_expr: 'as_int(!HasTag(`dps`))',
          },
          {
            effectReference: 'global_dps_multiplier_mult,20',
            amount_func: 'mult',
            stack_func: 'per_hero_attribute',
            per_hero_expr: 'as_int(HasTag(`dragonborn`))',
          },
          {
            effectReference: 'global_dps_multiplier_mult,20',
            amount_func: 'mult',
            stack_func: 'per_hero_attribute',
            per_hero_expr: 'as_int(GetStat(`int`) >= min_stat_value)',
          },
        ],
        loot: [],
        legendaryEffects: [],
      },
    ])

    expect(report.totals.perHeroExprTotal).toBe(4)
    expect(report.totals.parsedPerHeroExprTotal).toBe(3)
    expect(report.totals.unparsedPerHeroExprTotal).toBe(1)
    expect(report.topUnparsedPerHeroExpr[0]).toEqual({
      key: 'as_int(GetStat(`int`) >= min_stat_value)',
      count: 1,
    })
  })

  it('把 base_attack_cooldown 比较表达式计入已解析，但裸 cooldown 表达式仍保持未解析', () => {
    const report = generateSignalCoverageReport([
      {
        upgrades: [
          {
            effectReference: 'global_dps_multiplier_mult,20',
            amount_func: 'mult',
            stack_func: 'per_hero_attribute',
            per_hero_expr: 'base_attack_cooldown<=4',
          },
          {
            effectReference: 'global_dps_multiplier_mult,20',
            amount_func: 'mult',
            stack_func: 'per_hero_attribute',
            per_hero_expr: 'base_attack_cooldown',
          },
        ],
        loot: [],
        legendaryEffects: [],
      },
    ])

    expect(report.totals.perHeroExprTotal).toBe(2)
    expect(report.totals.parsedPerHeroExprTotal).toBe(1)
    expect(report.totals.unparsedPerHeroExprTotal).toBe(1)
    expect(report.topUnparsedPerHeroExpr[0]).toEqual({
      key: 'base_attack_cooldown',
      count: 1,
    })
  })

  it('把 total_ability_score 比较表达式计入已解析，但含 HasEffect 等运行时谓词的组合仍保持未解析', () => {
    const report = generateSignalCoverageReport([
      {
        upgrades: [
          {
            effectReference: 'global_dps_multiplier_mult,20',
            amount_func: 'mult',
            stack_func: 'per_hero_attribute',
            per_hero_expr: 'GetStat(`total_ability_score`) <= 78',
          },
          {
            effectReference: 'global_dps_multiplier_mult,20',
            amount_func: 'mult',
            stack_func: 'per_hero_attribute',
            per_hero_expr: 'HasTag(`good`) && HasEffect(`celeste_heal`)',
          },
        ],
        loot: [],
        legendaryEffects: [],
      },
    ])

    expect(report.totals.perHeroExprTotal).toBe(2)
    expect(report.totals.parsedPerHeroExprTotal).toBe(1)
    expect(report.totals.unparsedPerHeroExprTotal).toBe(1)
    expect(report.totals.signalsWithStatCountQualifier).toBe(1)
    expect(report.topUnparsedPerHeroExpr[0]).toEqual({
      key: 'HasTag(`good`) && HasEffect(`celeste_heal`)',
      count: 1,
    })
  })

  it('对 buff_upgrade wrapper 区分 family unsupported、base resolved 和 base unresolved', () => {
    const report = generateSignalCoverageReport([
      {
        upgrades: [
          {
            id: '2001',
            effectReference: 'effect_def,base-supported',
            effectDefinition: {
              snapshots: {
                original: {
                  effect_keys: [
                    { effect_string: 'hero_dps_multiplier_mult,75', targets: ['adj'] },
                  ],
                },
              },
            },
          },
          {
            id: '2002',
            effectReference: 'effect_def,buff-supported',
            effectDefinition: {
              snapshots: {
                original: {
                  effect_keys: [
                    { effect_string: 'buff_upgrade,50,2001' },
                  ],
                },
              },
            },
          },
          {
            id: '2003',
            effectReference: 'effect_def,base-unsupported',
            effectDefinition: {
              snapshots: {
                original: {
                  effect_keys: [
                    { effect_string: 'paid_up_front_increase_dps,25' },
                  ],
                },
              },
            },
          },
          {
            id: '2004',
            effectReference: 'effect_def,buff-unresolved',
            effectDefinition: {
              snapshots: {
                original: {
                  effect_keys: [
                    { effect_string: 'buff_upgrade,40,2003' },
                  ],
                },
              },
            },
          },
          {
            id: '2005',
            effectReference: 'effect_def,buff-unsupported-family',
            effectDefinition: {
              snapshots: {
                original: {
                  effect_keys: [
                    { effect_string: 'buff_upgrade_per_target_crusader_mult,40,2001,adj' },
                  ],
                },
              },
            },
          },
        ],
        loot: [],
        legendaryEffects: [],
      },
    ])

    expect(report.totals.buffUpgradeWrapperTotal).toBe(3)
    expect(report.totals.buffUpgradeWrapperSupportedBaseResolved).toBe(1)
    expect(report.totals.buffUpgradeWrapperSupportedBaseUnresolved).toBe(1)
    expect(report.totals.buffUpgradeWrapperFamilyUnsupported).toBe(1)
    expect(report.buffUpgradeWrapperStatus).toEqual([
      { key: 'wrapper-family-unsupported', count: 1 },
      { key: 'wrapper-supported-base-resolved', count: 1 },
      { key: 'wrapper-supported-base-unresolved', count: 1 },
    ])
    expect(report.buffUpgradeWrapperUnresolvedReasons).toEqual([
      { key: 'base-effect-unrecognized', count: 1 },
      { key: 'wrapper-kind-unsupported', count: 1 },
    ])
    expect(report.topBuffUpgradeMissingBaseEffects).toEqual([
      { key: 'paid_up_front_increase_dps', count: 1 },
    ])
    expect(report.topBuffUpgradeWrapperKinds).toEqual([
      { key: 'buff_upgrade', count: 2 },
      { key: 'buff_upgrade_per_target_crusader_mult', count: 1 },
    ])
  })
})
