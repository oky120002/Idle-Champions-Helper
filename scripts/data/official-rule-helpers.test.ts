import { expect, it } from 'vitest'
import { unwrap } from '../../tests/utils/dom-assertions.ts'

import {
  buildChampionPatronEligibility,
  buildScenarioModeTags,
  buildScenarioRuleContextId,
  normalizeEffectStringReference,
  normalizeOfficialBuffDefinition,
  normalizeOfficialEffectKeyDefinition,
  normalizeOfficialGameRuleDefinition,
  normalizeOfficialStatDefinition,
  normalizePatronPerkDefinition,
  normalizePatronDefinition,
  normalizePatronPerkTierDefinition,
  normalizePatronObjectiveTiers,
  normalizeTrialsDifficultyDefinition,
  normalizeTrialsRoleDefinition,
} from './official-rule-helpers.ts'

it('normalizePatronDefinition 结构化提取 patron 限制规则', () => {
  const patron = normalizePatronDefinition(
    {
      id: 5,
      name: 'Elminster',
      description: 'Only recent event champions can be used.',
      restrictions_text: {
        1: 'Only Champions released or reworked in an event in the past 3 years can be used.',
      },
      game_changes: {
        1: [
          {
            type: 'disallow_crusaders',
            by_expr: {
              expr: 'TimeAvailable(`days`) > (365 * 3)',
            },
          },
          {
            type: 'force_allow_hero',
            hero_ids: [58],
          },
        ],
      },
      properties: {
        short_name: 'Elminster',
        min_objective_level: 825,
        default_objective_bump: 300,
      },
      weekly_free_play_cap: 5000,
    },
    {
      name: '艾尔明斯特',
      description: '只能使用过去 3 年内发布或重做过的勇士。',
      restrictions_text: {
        1: '只能使用过去 3 年内发布或重做过的勇士。',
      },
    },
  )

  expect(patron).not.toBeNull()
  if (!patron) throw new Error('expected patron to be defined')

  expect(patron.name).toEqual({
    original: 'Elminster',
    display: '艾尔明斯特',
  })
  expect(patron.shortName).toBe('Elminster')
  expect(patron.forceAllowedHeroIds).toEqual(['58'])
  expect(patron.evaluationStatus).toBe('complete')
  expect(patron.eligibilityRules).toEqual([
    {
      type: 'time_available_days',
      rawExpression: 'TimeAvailable(`days`) > (365 * 3)',
      maxAgeDays: 1095,
      supported: true,
    },
  ])
})

it('buildChampionPatronEligibility 评估 tag/stat/time-available 与 force allow', () => {
  const patrons = [
    unwrap(normalizePatronDefinition(
      {
        id: 1,
        name: 'Mirt',
        game_changes: {
          1: [
            {
              type: 'disallow_crusaders',
              by_tags: { tags: '!(good|evil)' },
            },
          ],
        },
      },
      { name: '米尔特' },
    ), 'patron Mirt'),
    unwrap(normalizePatronDefinition(
      {
        id: 2,
        name: 'Vajra',
        game_changes: {
          1: [
            {
              type: 'disallow_crusaders',
              by_stat: {
                stats: [{ stat: 'con', comp: '<', value: 14 }],
              },
            },
          ],
        },
      },
      { name: '瓦吉拉' },
    ), 'patron Vajra'),
    unwrap(normalizePatronDefinition(
      {
        id: 5,
        name: 'Elminster',
        game_changes: {
          1: [
            {
              type: 'disallow_crusaders',
              by_expr: { expr: 'TimeAvailable(`days`) > (365 * 3)' },
            },
            {
              type: 'force_allow_hero',
              hero_ids: [58],
            },
          ],
        },
      },
      { name: '艾尔明斯特' },
    ), 'patron Elminster'),
  ]

  const bruenor = buildChampionPatronEligibility(
    {
      id: 1,
      tags: ['good'],
      date_available: '2020-01-01 00:00:00',
      last_rework_date: '2025-01-01 00:00:00',
      character_sheet_details: {
        ability_scores: {
          con: 15,
        },
      },
    },
    patrons,
    '2026-04-11',
  )
  const hewMaan = buildChampionPatronEligibility(
    {
      id: 58,
      tags: ['kobold'],
      date_available: '2020-01-01 00:00:00',
      character_sheet_details: {
        ability_scores: {
          con: 13,
        },
      },
    },
    patrons,
    '2026-04-11',
  )

  expect(bruenor).toEqual({
    eligiblePatronIds: ['1', '2', '5'],
    ruleQualifiedPatronIds: ['1', '2', '5'],
    forcedEligiblePatronIds: [],
    unsupportedPatronIds: [],
  })
  expect(hewMaan).toEqual({
    eligiblePatronIds: ['5'],
    ruleQualifiedPatronIds: [],
    forcedEligiblePatronIds: ['5'],
    unsupportedPatronIds: [],
  })
})

it('normalizePatronObjectiveTiers 与 scenario mode tags 输出稳定结构', () => {
  const tiers = normalizePatronObjectiveTiers({
    2: {
      1: [{ condition: 'complete_area', area: '275' }],
    },
    1: {
      1: [{ condition: 'complete_area', area: '250' }],
    },
  })

  expect(tiers).toEqual([
    {
      patronId: '1',
      tierId: '1',
      objectiveArea: 250,
      objectives: [{ condition: 'complete_area', area: '250' }],
    },
    {
      patronId: '2',
      tierId: '1',
      objectiveArea: 275,
      objectives: [{ condition: 'complete_area', area: '275' }],
    },
  ])
  expect(buildScenarioRuleContextId('variant', '101')).toBe('variant:101')
  expect(buildScenarioModeTags('adventure', true, tiers)).toEqual(['adventure', 'free_play', 'patron'])
})

it('规则 / patron perk / trials 辅助归一化输出稳定结构', () => {
  const gameRule = normalizeOfficialGameRuleDefinition({
    id: 1,
    rule_name: 'role_tags_v2',
    rule: {
      tags: ['support', 'tank', 'speed'],
      enabled: true,
    },
  })
  const perkTier = normalizePatronPerkTierDefinition({
    id: 2,
    patron_id: 1,
    tier_id: 2,
    requirements: [
      {
        condition: 'patron_perks_purchased',
        patron_id: 1,
        amount: 15,
      },
    ],
  })
  const perk = normalizePatronPerkDefinition(
    {
      id: 4,
      patron_id: 1,
      tier_id: 2,
      name: 'Perk Up!',
      graphic_id: 4421,
      type: 2,
      levels: 20,
      cost: {
        base_cost: 12500,
        scaling: 1.05,
      },
      effects: [
        {
          effect_string: 'effect_def,453',
          per_level: 2.5,
          target_name: 'all Champions',
        },
      ],
      properties: [],
    },
    {
      name: '活跃起来！',
    },
  )
  const trialsRole = normalizeTrialsRoleDefinition(
    {
      id: 1,
      name: 'Forest - Balance the Forest',
      description: 'Liberate the forest.',
      graphic_id: 11042,
      adventure_id: 907,
      location_position_x: 356,
      location_position_y: 518,
    },
    {
      name: '森林--森林重归平衡',
      description: '解救森林。',
    },
    {
      id: '907',
      isVariant: false,
      name: {
        original: 'Balance the Forest',
        display: '森林重归平衡',
      },
      campaign: {
        id: '9',
        original: 'Trials of Mount Tiamat',
        display: '提亚马特山试炼',
      },
      objectiveArea: 650,
      locationId: '11',
      areaSetId: '91',
    },
  )
  const difficulty = normalizeTrialsDifficultyDefinition(
    {
      id: 2,
      graphic_id: 11015,
      name: 'Heroic',
      short_name: 'H',
      description: '',
      points: 1867,
      tiamat_health: '750000000',
      cost: [
        {
          cost: 'trials_difficulty_token',
          difficulty_token_id: 'normal',
          amount: 1,
        },
      ],
      reward_data: [
        {
          deprecated: 'do not use',
        },
      ],
    },
    {
      name: '英勇',
      short_name: 'H',
      description: '',
    },
  )

  expect(gameRule).toEqual({
    id: '1',
    ruleName: 'role_tags_v2',
    topLevelKeys: ['enabled', 'tags'],
    rule: {
      tags: ['support', 'tank', 'speed'],
      enabled: true,
    },
  })
  expect(perkTier).toEqual({
    id: '2',
    patronId: '1',
    tierId: '2',
    requiredPurchasedPerkCount: 15,
    requirements: [
      {
        condition: 'patron_perks_purchased',
        patron_id: 1,
        amount: 15,
      },
    ],
  })
  expect(perk).toEqual({
    id: '4',
    patronId: '1',
    tierId: '2',
    name: {
      original: 'Perk Up!',
      display: '活跃起来！',
    },
    graphicId: '4421',
    typeId: 2,
    levels: 20,
    cost: {
      baseCost: 12500,
      scaling: 1.05,
    },
    effects: [
      {
        effectString: 'effect_def,453',
        key: 'effect_def',
        args: ['453'],
        perLevel: 2.5,
        targetName: 'all Champions',
        effectDefinitionId: '453',
      },
    ],
    effectDefinitionIds: ['453'],
    properties: [],
  })
  expect(trialsRole).toEqual({
    id: '1',
    name: {
      original: 'Forest - Balance the Forest',
      display: '森林--森林重归平衡',
    },
    description: {
      original: 'Liberate the forest.',
      display: '解救森林。',
    },
    graphicId: '11042',
    adventureId: '907',
    scenarioKind: 'adventure',
    ruleContextId: 'adventure:907',
    adventure: {
      id: '907',
      name: {
        original: 'Balance the Forest',
        display: '森林重归平衡',
      },
      campaign: {
        id: '9',
        original: 'Trials of Mount Tiamat',
        display: '提亚马特山试炼',
      },
      objectiveArea: 650,
      locationId: '11',
      areaSetId: '91',
    },
    position: {
      x: 356,
      y: 518,
    },
  })
  expect(difficulty).toEqual({
    id: '2',
    name: {
      original: 'Heroic',
      display: '英勇',
    },
    shortName: 'H',
    description: null,
    graphicId: '11015',
    points: 1867,
    tiamatHealth: 750000000,
    costs: [
      {
        costType: 'trials_difficulty_token',
        difficultyTokenId: 'normal',
        amount: 1,
      },
    ],
    rewardData: [
      {
        deprecated: 'do not use',
      },
    ],
  })
})

it('stat / buff / effect key 辅助归一化输出稳定结构', () => {
  const stat = normalizeOfficialStatDefinition({
    id: 7,
    name: 'hero_level',
    multi_key: 0,
    clear_on_reset: 1,
    server_only: 0,
    read_only: 1,
  })
  const buff = normalizeOfficialBuffDefinition(
    {
      id: 11,
      name: "Small Potion of Giant's Strength",
      description: 'A testing potion.',
      effect: 'global_dps_multiplier_mult,100',
      rarity: 1,
      duration: 300,
      graphic_id: 730,
      odds: 100,
      tags: ['duration', 'potion', 'dps'],
      inventory_order: '10',
      properties: {
        inventory_graphic_id: 731,
        name_plural: "Small Potions of Giant's Strength",
      },
    },
    {
      name: '小瓶巨人之力药剂',
      description: '测试用药剂。',
      properties: {
        name_plural: '小瓶巨人之力药剂',
      },
    },
  )
  const effectKey = normalizeOfficialEffectKeyDefinition(
    {
      id: 199,
      key: 'hero_dps_multiplier_if_attack_cooldown',
      param_names: 'amount,str comparison,check',
      owner: '',
      properties: {
        negative: true,
        scope: 'base_attack',
      },
      descriptions: {
        desc: 'Increases the DPS of $target by $amount% if their Base Attack cooldown matches $check.',
      },
    },
    {
      descriptions: {
        desc: '如果 $target 的基础攻击冷却满足 $check，则其伤害提高 $amount%。',
      },
    },
  )

  expect(normalizeEffectStringReference('effect_def,453')).toEqual({
    effectString: 'effect_def,453',
    key: 'effect_def',
    args: ['453'],
    effectDefinitionId: '453',
  })
  expect(stat).toEqual({
    id: '7',
    name: 'hero_level',
    multiKey: false,
    clearOnReset: true,
    serverOnly: false,
    readOnly: true,
    properties: null,
  })
  expect(buff).toEqual({
    id: '11',
    name: {
      original: "Small Potion of Giant's Strength",
      display: '小瓶巨人之力药剂',
    },
    description: {
      original: 'A testing potion.',
      display: '测试用药剂。',
    },
    pluralName: {
      original: "Small Potions of Giant's Strength",
      display: '小瓶巨人之力药剂',
    },
    effect: {
      effectString: 'global_dps_multiplier_mult,100',
      key: 'global_dps_multiplier_mult',
      args: ['100'],
      effectDefinitionId: null,
    },
    rarity: 1,
    duration: 300,
    graphicId: '730',
    inventoryGraphicId: '731',
    odds: 100,
    inventoryOrder: 10,
    tags: ['dps', 'duration', 'potion'],
    properties: null,
  })
  expect(effectKey).toEqual({
    id: '199',
    key: 'hero_dps_multiplier_if_attack_cooldown',
    owner: null,
    paramNames: [
      {
        name: 'amount',
        type: null,
      },
      {
        name: 'comparison',
        type: 'str',
      },
      {
        name: 'check',
        type: null,
      },
    ],
    descriptions: {
      desc: {
        original: 'Increases the DPS of $target by $amount% if their Base Attack cooldown matches $check.',
        display: '如果 $target 的基础攻击冷却满足 $check，则其伤害提高 $amount%。',
      },
    },
    negative: true,
    properties: {
      scope: 'base_attack',
    },
  })
})
