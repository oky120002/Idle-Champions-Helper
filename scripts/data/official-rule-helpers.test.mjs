import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildChampionPatronEligibility,
  buildScenarioModeTags,
  buildScenarioRuleContextId,
  normalizePatronDefinition,
  normalizePatronObjectiveTiers,
} from './official-rule-helpers.mjs'

test('normalizePatronDefinition 结构化提取 patron 限制规则', () => {
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

  assert.deepEqual(patron.name, {
    original: 'Elminster',
    display: '艾尔明斯特',
  })
  assert.equal(patron.shortName, 'Elminster')
  assert.deepEqual(patron.forceAllowedHeroIds, ['58'])
  assert.equal(patron.evaluationStatus, 'complete')
  assert.deepEqual(patron.eligibilityRules, [
    {
      type: 'time_available_days',
      rawExpression: 'TimeAvailable(`days`) > (365 * 3)',
      maxAgeDays: 1095,
      supported: true,
    },
  ])
})

test('buildChampionPatronEligibility 评估 tag/stat/time-available 与 force allow', () => {
  const patrons = [
    normalizePatronDefinition(
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
    ),
    normalizePatronDefinition(
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
    ),
    normalizePatronDefinition(
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
    ),
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

  assert.deepEqual(bruenor, {
    eligiblePatronIds: ['1', '2', '5'],
    ruleQualifiedPatronIds: ['1', '2', '5'],
    forcedEligiblePatronIds: [],
    unsupportedPatronIds: [],
  })
  assert.deepEqual(hewMaan, {
    eligiblePatronIds: ['5'],
    ruleQualifiedPatronIds: [],
    forcedEligiblePatronIds: ['5'],
    unsupportedPatronIds: [],
  })
})

test('normalizePatronObjectiveTiers 与 scenario mode tags 输出稳定结构', () => {
  const tiers = normalizePatronObjectiveTiers({
    2: {
      1: [{ condition: 'complete_area', area: '275' }],
    },
    1: {
      1: [{ condition: 'complete_area', area: '250' }],
    },
  })

  assert.deepEqual(tiers, [
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
  assert.equal(buildScenarioRuleContextId('variant', '101'), 'variant:101')
  assert.deepEqual(buildScenarioModeTags('adventure', true, tiers), ['adventure', 'free_play', 'patron'])
})
