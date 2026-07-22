import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'

import { buildModels } from './build-models.mjs'
import { collectEffectEntries, normalizeEffectSignal } from './effect-helpers.mjs'
import { parseEffectPayload } from '../../src/domain/effects/effect-string.js'
import { normalizeEffectReference } from '../normalize-idle-champions-definitions.mjs'

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

test('buildModels 产出 hero abilities / scenarios / semantic overrides', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'idle-champions-hero-ability-models-'))
  const versionDir = path.join(tempDir, 'data')
  const detailDir = path.join(versionDir, 'champion-details')
  const semanticOverridesFile = path.join(tempDir, 'semantic-overrides.json')

  await mkdir(detailDir, { recursive: true })

  await writeFile(
    path.join(versionDir, 'champions.json'),
    JSON.stringify({
      updatedAt: '2026-06-04',
      items: [
        {
          id: '1',
          name: { original: 'Bruenor', display: '布鲁诺' },
          seat: 1,
          roles: ['support'],
          tags: ['dwarf'],
        },
      ],
    }),
  )
  await writeFile(
    path.join(versionDir, 'variants.json'),
    JSON.stringify({
      updatedAt: '2026-06-04',
      items: [
        {
          id: 'variant-1',
          campaign: { id: 'campaign-1', original: 'Grand Tour', display: '剑湾之旅' },
          name: { original: 'Archer Barrage', display: '弓兵压制' },
          adventureId: 'adventure-1',
          objectiveArea: 125,
          restrictions: [{ original: 'Only test heroes', display: '仅测试英雄' }],
          mechanics: ['slot_escort'],
        },
      ],
    }),
  )
  await writeFile(
    path.join(versionDir, 'formations.json'),
    JSON.stringify({
      updatedAt: '2026-06-04',
      items: [
        {
          id: 'layout-a',
          applicableContexts: [{ kind: 'adventure', id: 'adventure-1' }],
          sourceContexts: [],
          slots: [
            { id: 's1', row: 1, column: 1, x: 40, y: 10, adjacentSlotIds: ['s2'] },
            { id: 's2', row: 1, column: 2, x: 20, y: 10, adjacentSlotIds: ['s1'] },
          ],
        },
      ],
    }),
  )
  await writeFile(
    path.join(detailDir, '1.json'),
    JSON.stringify({
      attacks: {
        base: {
          id: 'base-1',
          cooldown: 4.5,
          damageTypes: ['magic'],
        },
      },
      characterSheet: {
        age: 40,
        abilityScores: { str: 15, dex: 12, con: 16, int: 10, wis: 11, cha: 13 },
      },
      upgrades: [
        {
          effectReference: 'hero_dps_multiplier_mult,100',
          effectDefinition: {
            snapshots: {
              original: {
                effect_keys: [
                  { effect_string: 'hero_dps_mult_per_target_crusader,100,adj', targets: ['self'] },
                ],
              },
            },
          },
        },
        {
          effectReference: 'hero_dps_mult_per_tagged_crusader_mult,200,companion',
          effectDefinition: {
            snapshots: {
              original: {
                effect_keys: [
                  { effect_string: 'hero_dps_mult_per_tagged_crusader_mult,200,companion' },
                ],
              },
            },
          },
        },
        {
          effectReference: 'hero_dps_mult_per_tagged_crusader_mult_amount_before,150,wafflecrew',
          effectDefinition: {
            snapshots: {
              original: {
                effect_keys: [
                  {
                    effect_string: 'hero_dps_mult_per_tagged_crusader_mult_amount_before,150,wafflecrew',
                    targets: ['all'],
                    filter_targets: [{ type: 'by_tags', tags: 'wafflecrew' }],
                  },
                ],
              },
            },
          },
        },
        {
          effectReference: 'hero_dps_mult_per_target_crusader_prebonus_mult,100,adj',
          effectDefinition: {
            snapshots: {
              original: {
                effect_keys: [
                  {
                    effect_string: 'hero_dps_mult_per_target_crusader_prebonus_mult,100,adj',
                    targets: [{ type: 'distance', distance: 2, comparison: '<=' }],
                    target_filters: [{ type: 'stat', stat: 'dex', comparison: 'gte', check: 15 }],
                  },
                ],
              },
            },
          },
        },
        {
          effectReference: 'hero_dps_mult_per_crusader_mult,100',
          effectDefinition: {
            snapshots: {
              original: {
                effect_keys: [
                  {
                    effect_string: 'hero_dps_mult_per_crusader_mult,100',
                    targets: [{ type: 'attack_type', attack: 'magic' }],
                    target_filters: [{ type: 'attack_type', attack: 'magic' }],
                  },
                ],
              },
            },
          },
        },
        {
          effectReference: 'hero_dps_mult_per_col_behind,100',
          effectDefinition: {
            snapshots: {
              original: {
                effect_keys: [
                  {
                    effect_string: 'hero_dps_mult_per_col_behind,100',
                    targets: ['behind'],
                  },
                ],
              },
            },
          },
        },
        {
          effectReference: 'hero_dps_mult_per_target_crusader_mult,100,all_slots',
          effectDefinition: {
            snapshots: {
              original: {
                effect_keys: [
                  {
                    effect_string: 'hero_dps_mult_per_target_crusader_mult,100,all_slots',
                    targets: ['self'],
                  },
                ],
              },
            },
          },
        },
        {
          id: 'upgrade-base-plain',
          effectReference: 'effect_def,base-plain',
          effectDefinition: {
            snapshots: {
              original: {
                effect_keys: [
                  {
                    effect_string: 'hero_dps_multiplier_mult,80',
                    targets: ['adj'],
                  },
                ],
              },
            },
          },
        },
        {
          id: 'upgrade-buff-plain',
          effectReference: 'effect_def,buff-plain',
          effectDefinition: {
            snapshots: {
              original: {
                effect_keys: [
                  {
                    effect_string: 'buff_upgrade,50,upgrade-base-plain',
                  },
                ],
              },
            },
          },
        },
        {
          id: 'upgrade-base-tagged',
          effectReference: 'effect_def,base-tagged',
          effectDefinition: {
            snapshots: {
              original: {
                effect_keys: [
                  {
                    effect_string: 'hero_dps_multiplier_mult,100',
                    targets: [{ type: 'stat', stat: 'int', comparison: '<=', value: 12 }],
                  },
                ],
              },
            },
          },
        },
        {
          id: 'upgrade-buff-tagged',
          effectReference: 'effect_def,buff-tagged',
          effectDefinition: {
            snapshots: {
              original: {
                effect_keys: [
                  {
                    effect_string: 'buff_upgrade_per_any_tagged_crusader_mult,200,upgrade-base-tagged,evil',
                    stacks_multiply: true,
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
          id: '1002',
          effectReference: 'effect_def,buff-where',
          effectDefinition: {
            snapshots: {
              original: {
                effect_keys: [
                  { effect_string: 'pre_stack_amount,25' },
                  {
                    effect_string: 'buff_upgrade_per_any_crusader_where_mult,0,1001,int,>=,15',
                    amount_expr: 'upgrade_amount(1002,0)',
                    stacks_multiply: true,
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
                    stack_func_data: {
                      upgrade_id: 1003,
                      upgrade_index: 1,
                      only_slots_with_heroes: true,
                    },
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
        {
          effectReference: 'effect_def,999',
          effectDefinition: {
            snapshots: {
              original: {
                effect_keys: [
                  { effect_string: 'pre_stack_amount,100' },
                  {
                    effect_string: 'hero_dps_multiplier_mult,0',
                    amount_expr: 'upgrade_amount(999,0)',
                    amount_func: 'mult',
                    stack_func: 'per_upgrade_targets',
                    targets: ['non_adj'],
                  },
                ],
              },
            },
          },
        },
      ],
      loot: [
        {
          effects: [
            { effect_string: 'global_dps_multiplier_mult,65' },
          ],
        },
      ],
      legendaryEffects: [
        {
          effects: [
            {
              effect_string: 'tag_dps,40',
              filter_targets: [{ type: 'by_tags', tags: 'female' }],
              amount_func: 'add',
            },
          ],
        },
        {
          effects: [
            {
              effect_string: 'global_dps_multiplier_mult,20',
              amount_func: 'add',
              stack_func: 'per_crusader',
              target_filters: [{ type: 'stat', stat: 'str', check: 15, comparison: '>=' }],
            },
          ],
        },
      ],
    }),
  )
  await writeFile(
    semanticOverridesFile,
    JSON.stringify({
      heroOverrides: {
        '1': {
          supportSignals: [
            { kind: 'adjacentBuff', value: 150, rawEffect: 'adjacent_buff,150' },
          ],
        },
      },
    }),
  )

  const result = await buildModels({ versionDir, semanticOverridesFile })
  const heroAbilities = await readJson(path.join(versionDir, 'hero-abilities.json'))
  const scenarioModels = await readJson(path.join(versionDir, 'scenarios.json'))
  const semanticOverrides = await readJson(path.join(versionDir, 'semantic-overrides.json'))

  assert.equal(result.heroCount, 1)
  assert.equal(result.scenarioCount, 1)
  assert.equal(heroAbilities.updatedAt, '2026-06-04')
  assert.equal(heroAbilities.items[0].heroId, '1')
  assert.deepEqual(heroAbilities.items[0].baseAttackDamageTypes, ['magic'])
  assert.equal(heroAbilities.items[0].baseAttackCooldown, 4.5)
  assert.equal(heroAbilities.items[0].age, 40)
  assert.equal(heroAbilities.items[0].abilityScores.str, 15)
  assert.equal(heroAbilities.items[0].carrySignals[0].kind, 'heroDpsMultiplier')
  const perTargetCarry = heroAbilities.items[0].carrySignals.find((signal) => signal.rawEffect === 'hero_dps_mult_per_target_crusader,100,adj')
  const perTaggedCarry = heroAbilities.items[0].carrySignals.find((signal) => signal.rawEffect === 'hero_dps_mult_per_tagged_crusader_mult,200,companion')
  const perTaggedBeforeCarry = heroAbilities.items[0].supportSignals.find((signal) => signal.rawEffect === 'hero_dps_mult_per_tagged_crusader_mult_amount_before,150,wafflecrew')
  const perTargetPrebonusSupport = heroAbilities.items[0].supportSignals.find((signal) => signal.rawEffect === 'hero_dps_mult_per_target_crusader_prebonus_mult,100,adj')
  const globalSupport = heroAbilities.items[0].supportSignals.find((signal) => signal.rawEffect === 'global_dps_multiplier_mult,65')
  const taggedSupport = heroAbilities.items[0].supportSignals.find((signal) => signal.rawEffect === 'tag_dps,40')
  const statCountSupport = heroAbilities.items[0].supportSignals.find((signal) => signal.rawEffect === 'global_dps_multiplier_mult,20')
  const targetedHeroSupport = heroAbilities.items[0].supportSignals.find((signal) => signal.rawEffect === 'hero_dps_multiplier_mult,0')
  const attackTypeSupport = heroAbilities.items[0].supportSignals.find((signal) => signal.rawEffect === 'hero_dps_mult_per_crusader_mult,100')
  const behindColumnSupport = heroAbilities.items[0].supportSignals.find((signal) => signal.rawEffect === 'hero_dps_mult_per_col_behind,100')
  const perTargetAllSlotsCarry = heroAbilities.items[0].carrySignals.find((signal) => signal.rawEffect === 'hero_dps_mult_per_target_crusader_mult,100,all_slots')
  const plainBuffSupport = heroAbilities.items[0].supportSignals.find((signal) => signal.rawEffect === 'buff_upgrade,50,upgrade-base-plain')
  const taggedBuffSupport = heroAbilities.items[0].supportSignals.find((signal) => signal.rawEffect === 'buff_upgrade_per_any_tagged_crusader_mult,200,upgrade-base-tagged,evil')
  const whereBuffSupport = heroAbilities.items[0].supportSignals.find((signal) => signal.rawEffect === 'buff_upgrade_per_any_crusader_where_mult,0,1001,int,>=,15')
  const distanceBuffSupport = heroAbilities.items[0].supportSignals.find((signal) => signal.rawEffect === 'buff_upgrade_mult_by_distance_from_source_mult,400,1003')

  assert.equal(perTargetCarry?.kind, 'heroDpsMultiplier')
  assert.equal(perTargetCarry?.amountFunc, 'add')
  assert.equal(perTargetCarry?.stackFunc, 'per_target_crusader')
  assert.deepEqual(perTargetCarry?.formationCountPositionQualifier, {
    relation: 'adjacent',
  })
  assert.equal(perTaggedCarry?.amountFunc, 'mult')
  assert.equal(perTaggedCarry?.stackFunc, 'per_tagged_crusader_mult')
  assert.deepEqual(perTaggedCarry?.formationCountQualifier, {
    predicate: { op: 'tag', tag: 'companion' },
  })
  assert.equal(perTaggedBeforeCarry?.amountFunc, 'mult')
  assert.equal(perTaggedBeforeCarry?.stackFunc, 'per_tagged_crusader_mult')
  assert.deepEqual(perTaggedBeforeCarry?.formationCountQualifier, {
    predicate: { op: 'tag', tag: 'wafflecrew' },
  })
  assert.deepEqual(perTaggedBeforeCarry?.targetQualifier, {
    predicate: { op: 'tag', tag: 'wafflecrew' },
  })
  assert.equal(perTargetPrebonusSupport?.amountFunc, 'mult')
  assert.equal(perTargetPrebonusSupport?.stackFunc, 'per_target_crusader')
  assert.deepEqual(perTargetPrebonusSupport?.formationCountPositionQualifier, {
    relation: 'adjacent',
  })
  assert.deepEqual(perTargetPrebonusSupport?.positionQualifier, {
    relation: 'withinTwoSlots',
  })
  assert.deepEqual(perTargetPrebonusSupport?.targetQualifier, {
    predicate: { op: 'stat', stat: 'dex', operator: '>=', value: 15 },
  })
  assert.equal(globalSupport?.kind, 'globalDpsMultiplier')
  assert.equal(taggedSupport?.amountFunc, 'add')
  assert.deepEqual(taggedSupport?.targetQualifier, {
    predicate: { op: 'tag', tag: 'female' },
  })
  assert.deepEqual(statCountSupport?.formationCountQualifier, {
    predicate: { op: 'stat', stat: 'str', operator: '>=', value: 15 },
  })
  assert.equal(targetedHeroSupport?.kind, 'heroDpsMultiplier')
  assert.equal(targetedHeroSupport?.value, 100)
  assert.equal(targetedHeroSupport?.stackFunc, 'per_upgrade_targets')
  assert.deepEqual(targetedHeroSupport?.positionQualifier, {
    relation: 'nonAdjacent',
  })
  assert.equal(attackTypeSupport?.amountFunc, 'mult')
  assert.equal(attackTypeSupport?.stackFunc, 'per_crusader')
  assert.deepEqual(attackTypeSupport?.targetQualifier, {
    predicate: { op: 'attackType', attackType: 'magic', negate: false },
  })
  assert.deepEqual(attackTypeSupport?.formationCountQualifier, {
    predicate: { op: 'attackType', attackType: 'magic', negate: false },
  })
  assert.equal(behindColumnSupport?.amountFunc, 'mult')
  assert.equal(behindColumnSupport?.stackFunc, 'per_col_behind')
  assert.deepEqual(behindColumnSupport?.positionQualifier, {
    relation: 'allBehindColumns',
  })
  // all_slots / all 计数目标 = 全阵位计数（relation 'any'）；消费层 countQualifiedHeroes
  // 已支持 'any'（不计位置，只按 formationCountQualifier 计数）。
  // resolveCountRelation 曾因 relation==='any' 返回 null，导致全阵位 per_target_crusader
  // effect 被静默丢弃——第六轮审计修复。
  assert.equal(perTargetAllSlotsCarry?.kind, 'heroDpsMultiplier')
  assert.equal(perTargetAllSlotsCarry?.stackFunc, 'per_target_crusader')
  assert.deepEqual(perTargetAllSlotsCarry?.formationCountPositionQualifier, {
    relation: 'any',
  })
  assert.equal(plainBuffSupport?.kind, 'heroDpsMultiplier')
  assert.equal(plainBuffSupport?.value, 50)
  assert.equal(plainBuffSupport?.bonusScaleOfSignal?.rawEffect, 'hero_dps_multiplier_mult,80')
  assert.deepEqual(plainBuffSupport?.positionQualifier, {
    relation: 'adjacent',
  })
  assert.equal(taggedBuffSupport?.kind, 'heroDpsMultiplier')
  assert.equal(taggedBuffSupport?.amountFunc, 'mult')
  assert.equal(taggedBuffSupport?.stackFunc, 'per_tagged_crusader_mult')
  assert.deepEqual(taggedBuffSupport?.formationCountQualifier, {
    predicate: { op: 'tag', tag: 'evil' },
  })
  assert.equal(taggedBuffSupport?.bonusScaleOfSignal?.rawEffect, 'hero_dps_multiplier_mult,100')
  assert.deepEqual(taggedBuffSupport?.targetQualifier, {
    predicate: { op: 'stat', stat: 'int', operator: '<=', value: 12 },
  })
  assert.equal(whereBuffSupport?.kind, 'heroDpsMultiplier')
  assert.equal(whereBuffSupport?.value, 25)
  assert.equal(whereBuffSupport?.amountFunc, 'mult')
  assert.equal(whereBuffSupport?.stackFunc, 'per_crusader')
  assert.equal(whereBuffSupport?.bonusScaleOfSignal?.rawEffect, 'hero_dps_multiplier_mult,60')
  assert.deepEqual(whereBuffSupport?.formationCountQualifier, {
    predicate: { op: 'stat', stat: 'int', operator: '>=', value: 15 },
  })
  assert.deepEqual(whereBuffSupport?.targetQualifier, {
    predicate: { op: 'attackType', attackType: 'magic', negate: false },
  })
  assert.equal(distanceBuffSupport?.kind, 'heroDpsMultiplier')
  assert.equal(distanceBuffSupport?.value, 400)
  assert.equal(distanceBuffSupport?.amountFunc, 'mult')
  assert.equal(distanceBuffSupport?.stackFunc, 'per_slot_distance_from_source')
  assert.equal(distanceBuffSupport?.bonusScaleOfSignal?.rawEffect, 'hero_dps_multiplier_mult,0')
  assert.deepEqual(distanceBuffSupport?.positionQualifier, {
    relation: 'nonAdjacent',
  })
  assert.equal(distanceBuffSupport?.targetQualifier ?? null, null)
  assert.deepEqual(
    heroAbilities.items[0].unsupportedSignals
      .map((signal) => signal.rawEffect)
      .filter((rawEffect) => rawEffect !== 'effect_def'),
    ['pre_stack_amount', 'pre_stack_amount', 'pre_stack_amount'],
  )
  assert.equal(scenarioModels.items[0].formationLayoutId, 'layout-a')
  assert.deepEqual(scenarioModels.items[0].slotTopology, [
    { slotId: 's1', row: 1, column: 1, x: 40, y: 10, adjacentSlotIds: ['s2'] },
    { slotId: 's2', row: 1, column: 2, x: 20, y: 10, adjacentSlotIds: ['s1'] },
  ])
  // 9.1: slot_escort mechanic 锁定前排槽位（column 降序首槽 = s2）。
  assert.deepEqual(scenarioModels.items[0].lockedSlots, ['s2'])
  assert.ok(
    scenarioModels.items[0].scenarioWarnings.some((w) => w.includes('护送任务')),
    `expected escort warning, got: ${JSON.stringify(scenarioModels.items[0].scenarioWarnings)}`,
  )
  assert.deepEqual(semanticOverrides.items, [
    {
      heroId: '1',
      supportSignals: [
        { kind: 'adjacentBuff', value: 150, rawEffect: 'adjacent_buff,150' },
      ],
    },
  ])
})

test('effectReference 直接引用 buff_upgrade wrapper 时不进 unsupportedSignals 噪声', async () => {
  // 真实数据模式：upgrade.effectReference 直接是 'buff_upgrade,...'，
  // effectDefinition 为 null（base effect 通过 upgrade id 引用，不在内联 effect_keys）。
  // wrapper 的实际 signal 由 collectEffectEntries 派生；裸 wrapper 名不得进 unsupportedSignals。
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'idle-champions-buff-upgrade-noise-'))
  const versionDir = path.join(tempDir, 'data')
  const detailDir = path.join(versionDir, 'champion-details')

  await mkdir(detailDir, { recursive: true })
  await writeFile(
    path.join(versionDir, 'champions.json'),
    JSON.stringify({
      updatedAt: '2026-06-04',
      items: [{ id: '1', name: { original: 'Bruenor', display: '布鲁诺' }, seat: 1, roles: ['support'], tags: ['dwarf'] }],
    }),
  )
  await writeFile(
    path.join(versionDir, 'variants.json'),
    JSON.stringify({ updatedAt: '2026-06-04', items: [] }),
  )
  await writeFile(
    path.join(versionDir, 'formations.json'),
    JSON.stringify({ updatedAt: '2026-06-04', items: [] }),
  )
  await writeFile(
    path.join(detailDir, '1.json'),
    JSON.stringify({
      upgrades: [
        {
          id: '4',
          effectReference: 'hero_dps_multiplier_mult,80',
          effectDefinition: null,
        },
        {
          id: '7',
          effectReference: 'buff_upgrade,100,4',
          effectDefinition: null,
        },
      ],
      loot: [],
      legendaryEffects: [],
    }),
  )

  await buildModels({ versionDir, semanticOverridesFile: path.join(tempDir, 'empty.json') })
  const heroAbilities = await readJson(path.join(versionDir, 'hero-abilities.json'))

  const unsupportedRawEffects = heroAbilities.items[0].unsupportedSignals.map((signal) => signal.rawEffect)
  assert.deepEqual(
    unsupportedRawEffects.filter((rawEffect) => rawEffect === 'buff_upgrade'),
    [],
    `buff_upgrade wrapper 不应进入 unsupportedSignals，实际：${JSON.stringify(unsupportedRawEffects)}`,
  )

  // 派生信号仍应存在：wrapper 以 base 80% 折算 100% 增量，bonusScaleOfSignal 指向 base。
  const allSignals = [...heroAbilities.items[0].carrySignals, ...heroAbilities.items[0].supportSignals]
  const derived = allSignals.find((signal) => signal.rawEffect === 'buff_upgrade,100,4')
  assert.equal(derived?.kind, 'heroDpsMultiplier')
  assert.equal(derived?.bonusScaleOfSignal?.rawEffect, 'hero_dps_multiplier_mult,80')
})

test('buff_upgrade wrapper 从标准 effectReference 派生 target base 信号', async () => {
  // normalize 层 normalizeEffectReference 已把 CNE effect 对象串提取为干净标准串（如
  // hero 101/102 的 effectReference 已是 'buff_upgrade,...'）；build-models 读 normalized
  // data，effectReference 永远是标准串。此处验证 wrapper 派生 target base 链路。
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'idle-champions-json-effectref-'))
  const versionDir = path.join(tempDir, 'data')
  const detailDir = path.join(versionDir, 'champion-details')

  await mkdir(detailDir, { recursive: true })
  await writeFile(
    path.join(versionDir, 'champions.json'),
    JSON.stringify({
      updatedAt: '2026-06-04',
      items: [{ id: '1', name: { original: 'Bruenor', display: '布鲁诺' }, seat: 1, roles: ['support'], tags: ['dwarf'] }],
    }),
  )
  await writeFile(
    path.join(versionDir, 'variants.json'),
    JSON.stringify({ updatedAt: '2026-06-04', items: [] }),
  )
  await writeFile(
    path.join(versionDir, 'formations.json'),
    JSON.stringify({ updatedAt: '2026-06-04', items: [] }),
  )
  await writeFile(
    path.join(detailDir, '1.json'),
    JSON.stringify({
      upgrades: [
        { id: '4', effectReference: 'hero_dps_multiplier_mult,80', effectDefinition: null },
        {
          id: '7',
          effectReference: 'buff_upgrade,100,4',
          effectDefinition: null,
        },
      ],
      loot: [],
      legendaryEffects: [],
    }),
  )

  await buildModels({ versionDir, semanticOverridesFile: path.join(tempDir, 'empty.json') })
  const heroAbilities = await readJson(path.join(versionDir, 'hero-abilities.json'))

  // wrapper 派生信号仍由 effectPayload.kind 正确识别并生成。
  const allSignals = [...heroAbilities.items[0].carrySignals, ...heroAbilities.items[0].supportSignals]
  const derived = allSignals.find((signal) => signal.rawEffect === 'buff_upgrade,100,4')
  assert.equal(derived?.kind, 'heroDpsMultiplier')
  assert.equal(derived?.bonusScaleOfSignal?.rawEffect, 'hero_dps_multiplier_mult,80')
})

test('amount_expr 跨 upgrade 引用按 upgrade id 解析目标 effect（非当前 upgrade）', async () => {
  // 真实数据（如 hero 106/141）：upgrade A 的 effect 用 amount_expr='upgrade_amount(B,0)'
  // 引用 upgrade B 的 effect_keys[0]。旧 resolveSimpleAmountExpr 忽略 upgrade id，
  // 错取当前 upgrade A 的 effect_keys[0]，得到错误 value。
  // 正确：按 id=5 找到 upgrade B，取其 effect_keys[0] 的 amount。
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'idle-champions-cross-upgrade-expr-'))
  const versionDir = path.join(tempDir, 'data')
  const detailDir = path.join(versionDir, 'champion-details')

  await mkdir(detailDir, { recursive: true })
  await writeFile(
    path.join(versionDir, 'champions.json'),
    JSON.stringify({
      updatedAt: '2026-06-04',
      items: [{ id: '1', name: { original: 'Bruenor', display: '布鲁诺' }, seat: 1, roles: ['support'], tags: ['dwarf'] }],
    }),
  )
  await writeFile(
    path.join(versionDir, 'variants.json'),
    JSON.stringify({ updatedAt: '2026-06-04', items: [] }),
  )
  await writeFile(
    path.join(versionDir, 'formations.json'),
    JSON.stringify({ updatedAt: '2026-06-04', items: [] }),
  )
  await writeFile(
    path.join(detailDir, '1.json'),
    JSON.stringify({
      upgrades: [
        {
          // upgrade B（id=5）：被引用的目标，effect_keys[0] = hero_dps_multiplier_mult,200
          id: '5',
          effectReference: 'effect_def,base-b',
          effectDefinition: {
            snapshots: { original: { effect_keys: [{ effect_string: 'hero_dps_multiplier_mult,200', targets: ['self'] }] } },
          },
        },
        {
          // upgrade A（id=7）：effect_keys[0] 是干扰项 pre_stack_amount,50；
          // effect_keys[1] 用 amount_expr='upgrade_amount(5,0)' 跨引用 upgrade B 的 effect_keys[0]。
          id: '7',
          effectReference: 'effect_def,base-a',
          effectDefinition: {
            snapshots: {
              original: {
                effect_keys: [
                  { effect_string: 'pre_stack_amount,50' },
                  {
                    effect_string: 'hero_dps_multiplier_mult,0',
                    amount_expr: 'upgrade_amount(5,0)',
                    targets: ['self'],
                  },
                ],
              },
            },
          },
        },
      ],
      loot: [],
      legendaryEffects: [],
    }),
  )

  await buildModels({ versionDir, semanticOverridesFile: path.join(tempDir, 'empty.json') })
  const heroAbilities = await readJson(path.join(versionDir, 'hero-abilities.json'))

  // upgrade A 的 hero_dps_multiplier_mult，value 必须从 upgrade B 取（200），不是 upgrade A 的 pre_stack_amount（50）
  const allSignals = [...heroAbilities.items[0].carrySignals, ...heroAbilities.items[0].supportSignals]
  const crossRefSignal = allSignals.find((signal) => signal.rawEffect === 'hero_dps_multiplier_mult,0')
  assert.equal(crossRefSignal?.value, 200, `跨 upgrade 引用应取 upgrade B 的 200，实际：${crossRefSignal?.value}`)
})

test('buff_upgrades wrapper 从标准 effectReference 派生 target base 信号', async () => {
  // normalize 层 normalizeEffectReference 已把 CNE effect 对象串（含伪 JSON）提取为干净
  // 标准串（守护见 normalize 测试「提取 CNE effect 对象串的 effect_string」）；build-models
  // 读 normalized data，effectReference 永远是标准串。此处验证 wrapper 派生 target base 链路。
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'idle-champions-cne-pseudo-json-'))
  const versionDir = path.join(tempDir, 'data')
  const detailDir = path.join(versionDir, 'champion-details')

  await mkdir(detailDir, { recursive: true })
  await writeFile(
    path.join(versionDir, 'champions.json'),
    JSON.stringify({
      updatedAt: '2026-06-04',
      items: [{ id: '1', name: { original: 'Bruenor', display: '布鲁诺' }, seat: 1, roles: ['support'], tags: ['dwarf'] }],
    }),
  )
  await writeFile(
    path.join(versionDir, 'variants.json'),
    JSON.stringify({ updatedAt: '2026-06-04', items: [] }),
  )
  await writeFile(
    path.join(versionDir, 'formations.json'),
    JSON.stringify({ updatedAt: '2026-06-04', items: [] }),
  )
  await writeFile(
    path.join(detailDir, '1.json'),
    JSON.stringify({
      upgrades: [
        { id: '4', effectReference: 'hero_dps_multiplier_mult,80', effectDefinition: null },
        { id: '5', effectReference: 'hero_dps_multiplier_mult,50', effectDefinition: null },
        {
          id: '7',
          effectReference: 'buff_upgrades,100,4,5',
          effectDefinition: null,
        },
      ],
      loot: [],
      legendaryEffects: [],
    }),
  )

  await buildModels({ versionDir, semanticOverridesFile: path.join(tempDir, 'empty.json') })
  const heroAbilities = await readJson(path.join(versionDir, 'hero-abilities.json'))

  // buff_upgrades wrapper（target ids 4,5）应派生 2 个信号，各指向对应 base。
  const allSignals = [...heroAbilities.items[0].carrySignals, ...heroAbilities.items[0].supportSignals]
  const derived = allSignals.filter((signal) => signal.rawEffect === 'buff_upgrades,100,4,5')
  assert.equal(derived.length, 2, `buff_upgrades 应派生 2 个信号（target 4 + 5），实际：${derived.length}`)
  const baseRawEffects = derived.map((signal) => signal.bonusScaleOfSignal?.rawEffect).sort()
  assert.deepEqual(baseRawEffects, ['hero_dps_multiplier_mult,50', 'hero_dps_multiplier_mult,80'])
})

test('normalizeEffectReference 提取 CNE effect 对象串的 effect_string（CI 守护）', () => {
  // normalize 层是 CNE effect 伪 JSON 处理的 single source——消费层 parseEffectPayload 已不处理
  // JSON（见 effect-string.js），依赖 normalize 产出干净标准串。此守护确保该链路有 CI 覆盖。
  // 完整 normalize 守护见 normalize-*.test.mjs（待接入 test:data，受 affiliations 测试隔离阻塞）。
  assert.equal(normalizeEffectReference('{"effect_string":"buff_upgrade,100,4","description":"x"}'), 'buff_upgrade,100,4')
  assert.equal(
    normalizeEffectReference('{\n"effect_string":"buff_upgrades,100,4,5"\n"description":"missing comma"}'),
    'buff_upgrades,100,4,5',
  )
  assert.equal(normalizeEffectReference('hero_dps_multiplier_mult,100'), 'hero_dps_multiplier_mult,100')
  assert.equal(normalizeEffectReference(null), null)
})

test('collectEffectEntries 收集 feat effects（与 loot/legendary 对称，M1 理论最大基线）', () => {
  // feat 是英雄专属固定能力（per-hero），其 global/hero_dps 加成应与 loot/legendary
  // 一样进入 M1 理论最大 carryDps 基线；此前 collectRawEffectEntries 漏遍历 detail.feats，
  // 全库 568 个 supported DPS signal 被整体漏算。
  const detail = {
    upgrades: [],
    loot: [],
    legendaryEffects: [],
    feats: [
      {
        id: '1',
        effects: [
          { effect_string: 'global_dps_multiplier_mult,10' },
          {
            effect_string: 'hero_dps_multiplier_mult,100',
            filter_targets: [{ type: 'hero_expr', hero_expr: 'HasTag(`dwarf`)' }],
          },
        ],
      },
    ],
  }
  const entries = collectEffectEntries(detail)
  const featEntries = entries.filter((entry) => entry.sourceBucket === 'feat')
  const effectStrings = featEntries.map((entry) => entry.effectString).sort()
  assert.deepEqual(effectStrings, ['global_dps_multiplier_mult,10', 'hero_dps_multiplier_mult,100'])
  // hero_expr 限定随 entry.effect 流入，消费层 attachSignalSemantics 正确处理。
  const heroDpsEntry = featEntries.find((entry) => entry.effectString === 'hero_dps_multiplier_mult,100')
  assert.deepEqual(heroDpsEntry.effect.filter_targets, [{ type: 'hero_expr', hero_expr: 'HasTag(`dwarf`)' }])
})

test('collectEffectEntries 对完全重复的 buff_upgrade wrapper 派生去重（装备模板冗余）', () => {
  // IC 装备系统在 definitions 里把同一 buff 按 装备槽/稀有度 展开成多条 effect 完全相同的
  // upgrade（仅 id 不同，magnitude 相同=非稀有度差异）。如 Jaheira 38 条
  // buff_upgrades,100,9714,9715,9716,9717，每条派生 4 base signal → 152 重复（91% 过度计算）。
  // 游戏 buff 按 effect 逻辑去重（同 effect_key 不叠加），派生层须对完全相同的 derived signal 去重。
  // （不同 magnitude 的稀有度取最高是另一问题，归阶段 8。）
  const detail = {
    upgrades: [
      { id: '4', effectReference: 'hero_dps_multiplier_mult,100', effectDefinition: null },
      { id: '7', effectReference: 'buff_upgrades,100,4', effectDefinition: null },
      { id: '8', effectReference: 'buff_upgrades,100,4', effectDefinition: null },
      { id: '9', effectReference: 'buff_upgrades,100,4', effectDefinition: null },
    ],
    loot: [],
    legendaryEffects: [],
    feats: [],
  }
  const entries = collectEffectEntries(detail)
  const derived = entries.filter((entry) => entry.sourceBucket === 'upgrade-buffed-signal')
  // 3 个相同 wrapper 指向同一 base 4 → 去重后只 1 个 derived signal。
  assert.equal(derived.length, 1, `3 个重复 buff_upgrades wrapper 应去重为 1 个 derived，实际：${derived.length}`)
  assert.equal(derived[0].signalPreset.bonusScaleOfSignal.rawEffect, 'hero_dps_multiplier_mult,100')
})

test('collectEffectEntries 同 base 不同 magnitude 的 wrapper 只保留最高（稀有度去重，阶段 8.5）', () => {
  // IC 装备稀有度：同一 buff 不同稀有度有不同 magnitude，游戏只生效最高稀有度。
  // 当前若全累加 → 高估。按 (kind, base target, qualifier) 分组，组内只保留最高 magnitude。
  const detail = {
    upgrades: [
      { id: '4', effectReference: 'hero_dps_multiplier_mult,100', effectDefinition: null },
      { id: '7', effectReference: 'buff_upgrades,100,4', effectDefinition: null },
      { id: '8', effectReference: 'buff_upgrades,200,4', effectDefinition: null },
      { id: '9', effectReference: 'buff_upgrades,150,4', effectDefinition: null },
    ],
    loot: [],
    legendaryEffects: [],
    feats: [],
  }
  const entries = collectEffectEntries(detail)
  const derived = entries.filter((entry) => entry.sourceBucket === 'upgrade-buffed-signal')
  assert.equal(derived.length, 1, `3 个不同 magnitude wrapper 应稀有度去重为 1 个，实际：${derived.length}`)
  assert.equal(derived[0].signalPreset.value, 200, '应保留最高 magnitude 200')
})

test('collectEffectEntries 派生 buff_upgrade wrapper 时合并 wrapper 自身 filter_targets', () => {
  // wrapper 自身的 filter_targets（如 hero_ids 白名单）限定 buff 只对特定英雄生效；
  // 此前 preset 只继承 base 的 targetQualifier，wrapper 自身 filter_targets 丢失。
  // 真实样本：hero 82 的 buff_upgrades + hero_ids:[82]（第四轮审计）。
  const detail = {
    upgrades: [
      { id: '4', effectReference: 'hero_dps_multiplier_mult,100', effectDefinition: null },
      {
        id: '7',
        effectDefinition: {
          snapshots: {
            original: {
              effect_keys: [
                {
                  effect_string: 'buff_upgrades,100,4',
                  filter_targets: [{ type: 'hero_ids', hero_ids: [82] }],
                },
              ],
            },
          },
        },
      },
    ],
    loot: [],
    legendaryEffects: [],
    feats: [],
  }
  const entries = collectEffectEntries(detail)
  const derived = entries.filter((entry) => entry.sourceBucket === 'upgrade-buffed-signal')
  assert.equal(derived.length, 1, `应派生 1 个 derived signal，实际：${derived.length}`)
  // wrapper 的 hero_ids 限定合并到 derived signal 的 targetQualifier（base 无 filter → 直接取 wrapper 限定）。
  assert.deepEqual(derived[0].signalPreset.targetQualifier, {
    predicate: { op: 'heroId', heroId: '82', negate: false },
  })
})

test('normalizeEffectSignal 解析 gold multiplier effect（阶段 3.2）', () => {
  // gold_multiplier_mult → globalGoldMultiplier（全队金币池，supportSignals）
  const plain = normalizeEffectSignal('gold_multiplier_mult', '200', 'official-parsed', {})
  assert.equal(plain.ok, true)
  assert.equal(plain.signal.kind, 'globalGoldMultiplier')
  assert.equal(plain.signal.value, 200)
  assert.equal(plain.bucket, 'supportSignals')

  // gold_mult_per_tagged_crusader_mult → globalGoldMultiplier + per_tagged stackFunc
  // 镜像 hero_dps_mult_per_tagged_crusader_mult 解析模式。
  const taggedPayload = parseEffectPayload('gold_mult_per_tagged_crusader_mult,100,companion')
  const tagged = normalizeEffectSignal(
    'gold_mult_per_tagged_crusader_mult',
    '100',
    'official-parsed',
    { effectPayload: taggedPayload, effect: {} },
  )
  assert.equal(tagged.ok, true)
  assert.equal(tagged.signal.kind, 'globalGoldMultiplier')
  assert.equal(tagged.signal.amountFunc, 'mult')
  assert.equal(tagged.signal.stackFunc, 'per_tagged_crusader_mult')
  assert.deepEqual(tagged.signal.formationCountQualifier, {
    predicate: { op: 'tag', tag: 'companion' },
  })

  // 非法 value 仍 unsupported（不绕过数值守卫）
  const bad = normalizeEffectSignal('gold_multiplier_mult', 'abc', 'official-parsed', {})
  assert.equal(bad.ok, false)
})

test('normalizeEffectSignal 解析 crit effect（阶段 4.2）', () => {
  // chance add → heroCritChance
  const chanceAdd = normalizeEffectSignal('buff_base_crit_chance_add', '35', 'official-parsed', {})
  assert.equal(chanceAdd.ok, true)
  assert.equal(chanceAdd.signal.kind, 'heroCritChance')
  assert.equal(chanceAdd.signal.value, 35)
  assert.equal(chanceAdd.bucket, 'supportSignals')

  // chance mult → heroCritChance + amountFunc mult
  const chanceMult = normalizeEffectSignal('buff_base_crit_chance_mult', '50', 'official-parsed', {})
  assert.equal(chanceMult.signal.kind, 'heroCritChance')
  assert.equal(chanceMult.signal.amountFunc, 'mult')

  // damage add → heroCritDamage
  const dmgAdd = normalizeEffectSignal('buff_base_crit_damage', '9', 'official-parsed', {})
  assert.equal(dmgAdd.signal.kind, 'heroCritDamage')
  assert.equal(dmgAdd.signal.amountFunc, undefined)

  // damage mult → heroCritDamage mult
  const dmgMult = normalizeEffectSignal('buff_base_crit_damage_mult', '15', 'official-parsed', {})
  assert.equal(dmgMult.signal.kind, 'heroCritDamage')
  assert.equal(dmgMult.signal.amountFunc, 'mult')

  // global chance/damage
  const gChance = normalizeEffectSignal('global_buff_base_crit_chance_add', '10', 'official-parsed', {})
  assert.equal(gChance.signal.kind, 'globalCritChance')
  const gDmgAdd = normalizeEffectSignal('global_buff_base_crit_damage_add', '12', 'official-parsed', {})
  assert.equal(gDmgAdd.signal.kind, 'globalCritDamage')
  assert.equal(gDmgAdd.signal.amountFunc, undefined)
  const gDmgMult = normalizeEffectSignal('global_buff_base_crit_damage_mult', '20', 'official-parsed', {})
  assert.equal(gDmgMult.signal.kind, 'globalCritDamage')
  assert.equal(gDmgMult.signal.amountFunc, 'mult')

  // 非法 value 仍 unsupported
  const bad = normalizeEffectSignal('buff_base_crit_chance_add', 'xyz', 'official-parsed', {})
  assert.equal(bad.ok, false)
})

test('normalizeEffectSignal 解析 health/healing/damage_reduction effect（阶段 5.1）', () => {
  const healthMult = normalizeEffectSignal('health_mult', '100', 'official-parsed', {})
  assert.equal(healthMult.ok, true)
  assert.equal(healthMult.signal.kind, 'heroHealthMultiplier')
  assert.equal(healthMult.bucket, 'supportSignals')

  const incHealth = normalizeEffectSignal('increase_health_by_source_percent', '50', 'official-parsed', {})
  assert.equal(incHealth.signal.kind, 'heroHealthMultiplier')

  const healing = normalizeEffectSignal('healing_mult', '30', 'official-parsed', {})
  assert.equal(healing.signal.kind, 'heroHealthMultiplier')

  const gHealing = normalizeEffectSignal('global_healing_mult', '20', 'official-parsed', {})
  assert.equal(gHealing.signal.kind, 'globalHealthMultiplier')

  const dmgRed = normalizeEffectSignal('damage_reduction', '15', 'official-parsed', {})
  assert.equal(dmgRed.signal.kind, 'damageReduction')
  assert.equal(dmgRed.signal.amountFunc, undefined)

  const dmgRedMult = normalizeEffectSignal('trials_damage_reduction_mult', '25', 'official-parsed', {})
  assert.equal(dmgRedMult.signal.kind, 'damageReduction')
  assert.equal(dmgRedMult.signal.amountFunc, 'mult')

  // 非法 value 仍 unsupported
  assert.equal(normalizeEffectSignal('health_mult', 'bad', 'official-parsed', {}).ok, false)
})

test('normalizeEffectSignal 解析 vulnerability effect（阶段 6.2）', () => {
  // 无条件 vulnerability
  const di = normalizeEffectSignal('damage_increase', '50', 'official-parsed', {})
  assert.equal(di.ok, true)
  assert.equal(di.signal.kind, 'enemyVulnerability')
  assert.equal(di.signal.monsterTags ?? null, null)

  const against = normalizeEffectSignal('increase_damage_against_monster', '30', 'official-parsed', {})
  assert.equal(against.signal.kind, 'enemyVulnerability')
  assert.equal(against.signal.monsterTags ?? null, null)

  // 按 monster tag（词表与 variant.enemyTypes 一致，| 为 OR）
  const tagPayload = parseEffectPayload('increase_damage_against_monster_tag,300,fiend')
  const tag = normalizeEffectSignal('increase_damage_against_monster_tag', '300', 'official-parsed', { effectPayload: tagPayload, effect: {} })
  assert.equal(tag.signal.kind, 'enemyVulnerability')
  assert.deepEqual(tag.signal.monsterTags, ['fiend'])

  // OR 列表
  const tagPayload2 = parseEffectPayload('increase_damage_against_monster_tag,200,humanoid|beast|undead')
  const tag2 = normalizeEffectSignal('increase_damage_against_monster_tag', '200', 'official-parsed', { effectPayload: tagPayload2, effect: {} })
  assert.deepEqual(tag2.signal.monsterTags, ['humanoid', 'beast', 'undead'])

  // armored 条件
  const armored = normalizeEffectSignal('increase_armored_damage', '40', 'official-parsed', {})
  assert.equal(armored.signal.kind, 'enemyVulnerability')
  assert.deepEqual(armored.signal.monsterTags, ['armored'])

  // 非法 value 仍 unsupported
  assert.equal(normalizeEffectSignal('damage_increase', 'bad', 'official-parsed', {}).ok, false)
})

test('normalizeEffectSignal 解析 speed/cooldown effect（阶段 7.1）', () => {
  const atkSpeed = normalizeEffectSignal('base_attack_speed_mult', '20', 'official-parsed', {})
  assert.equal(atkSpeed.signal.kind, 'attackSpeedMult')
  assert.equal(atkSpeed.signal.amountFunc, 'mult')

  const reduceAtk = normalizeEffectSignal('reduce_attack_cooldown', '15', 'official-parsed', {})
  assert.equal(reduceAtk.signal.kind, 'attackSpeedMult')
  assert.equal(reduceAtk.signal.amountFunc, undefined)

  const reduceUlt = normalizeEffectSignal('reduce_ultimate_cooldown', '10', 'official-parsed', {})
  assert.equal(reduceUlt.signal.kind, 'cooldownReduction')

  const ablCd = normalizeEffectSignal('ability_cooldown_reduction_mult', '25', 'official-parsed', {})
  assert.equal(ablCd.signal.kind, 'cooldownReduction')
  assert.equal(ablCd.signal.amountFunc, 'mult')

  assert.equal(normalizeEffectSignal('base_attack_speed_mult', 'bad', 'official-parsed', {}).ok, false)
})
