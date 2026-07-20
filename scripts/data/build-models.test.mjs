import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'

import { buildModels } from './build-models.mjs'

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
    requiredTags: ['companion'],
    matchMode: 'any',
  })
  assert.equal(perTaggedBeforeCarry?.amountFunc, 'mult')
  assert.equal(perTaggedBeforeCarry?.stackFunc, 'per_tagged_crusader_mult')
  assert.deepEqual(perTaggedBeforeCarry?.formationCountQualifier, {
    requiredTags: ['wafflecrew'],
    matchMode: 'any',
  })
  assert.deepEqual(perTaggedBeforeCarry?.targetQualifier, {
    requiredTags: ['wafflecrew'],
    matchMode: 'any',
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
    requiredStats: [{ stat: 'dex', operator: '>=', value: 15 }],
  })
  assert.equal(globalSupport?.kind, 'globalDpsMultiplier')
  assert.equal(taggedSupport?.amountFunc, 'add')
  assert.deepEqual(taggedSupport?.targetQualifier, {
    requiredTags: ['female'],
    matchMode: 'any',
  })
  assert.deepEqual(statCountSupport?.formationCountQualifier, {
    requiredStats: [{ stat: 'str', operator: '>=', value: 15 }],
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
    requiredAttackDamageTypes: ['magic'],
  })
  assert.deepEqual(attackTypeSupport?.formationCountQualifier, {
    requiredAttackDamageTypes: ['magic'],
  })
  assert.equal(behindColumnSupport?.amountFunc, 'mult')
  assert.equal(behindColumnSupport?.stackFunc, 'per_col_behind')
  assert.deepEqual(behindColumnSupport?.positionQualifier, {
    relation: 'allBehindColumns',
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
    requiredTags: ['evil'],
    matchMode: 'any',
  })
  assert.equal(taggedBuffSupport?.bonusScaleOfSignal?.rawEffect, 'hero_dps_multiplier_mult,100')
  assert.deepEqual(taggedBuffSupport?.targetQualifier, {
    requiredStats: [{ stat: 'int', operator: '<=', value: 12 }],
  })
  assert.equal(whereBuffSupport?.kind, 'heroDpsMultiplier')
  assert.equal(whereBuffSupport?.value, 25)
  assert.equal(whereBuffSupport?.amountFunc, 'mult')
  assert.equal(whereBuffSupport?.stackFunc, 'per_crusader')
  assert.equal(whereBuffSupport?.bonusScaleOfSignal?.rawEffect, 'hero_dps_multiplier_mult,60')
  assert.deepEqual(whereBuffSupport?.formationCountQualifier, {
    requiredStats: [{ stat: 'int', operator: '>=', value: 15 }],
  })
  assert.deepEqual(whereBuffSupport?.targetQualifier, {
    requiredAttackDamageTypes: ['magic'],
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

test('JSON-string effectReference 提取内部 effect_string，不产生垃圾 unsupported', async () => {
  // 真实数据模式（如 hero 101/102）：upgrade.effectReference 是 JSON 对象字符串
  // '{"effect_string":"buff_upgrade,100,4","description":"..."}'，而非简单 effect 串。
  // collectEffectEntries 必须用 effectPayload.effectString（parseEffectPayload 已提取），
  // 不能用原始 JSON 串——否则 splitEffectString 在 JSON 内部逗号处切断，产生
  // '{"effect_string":"buff_upgrade"' 这样的垃圾 effectName 进 unsupportedSignals。
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
          effectReference: '{"effect_string":"buff_upgrade,100,4","description":"Increase base by 100%"}',
          effectDefinition: null,
        },
      ],
      loot: [],
      legendaryEffects: [],
    }),
  )

  await buildModels({ versionDir, semanticOverridesFile: path.join(tempDir, 'empty.json') })
  const heroAbilities = await readJson(path.join(versionDir, 'hero-abilities.json'))

  const garbageUnsupported = heroAbilities.items[0].unsupportedSignals
    .filter((signal) => signal.rawEffect.startsWith('{'))
  assert.deepEqual(
    garbageUnsupported.map((signal) => signal.rawEffect),
    [],
    `JSON-string effectReference 不应产生垃圾 unsupported，实际：${JSON.stringify(heroAbilities.items[0].unsupportedSignals)}`,
  )

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

test('CNE effect 字段串字段间缺逗号（伪 JSON）时正则兜底恢复 wrapper 信号', async () => {
  // 数据源格式特性（非 bug，已对 raw upgrade_defines.effect 核实）：
  // CNE 序列化 effect 对象串时不保证字段间逗号，357 条对象串中 19 条 effect_string
  // 行末缺逗号，JSON.parse 失败 → parseEffectPayload 原返回 null → buff_upgrades wrapper
  // 信号丢失。正则提取 effect_string 覆盖合法与伪 JSON 两种形态，恢复 wrapper 派生链路。
  // 见 AGENTS.md「数据源格式追溯」守则。
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
          // 注意：effect_string 行末缺逗号——复现 CNE upgrade_defines.effect 的伪 JSON 格式。
          effectReference: '{\n"effect_string":"buff_upgrades,100,4,5"\n"description":"missing comma"}',
          effectDefinition: null,
        },
      ],
      loot: [],
      legendaryEffects: [],
    }),
  )

  await buildModels({ versionDir, semanticOverridesFile: path.join(tempDir, 'empty.json') })
  const heroAbilities = await readJson(path.join(versionDir, 'hero-abilities.json'))

  const garbageUnsupported = heroAbilities.items[0].unsupportedSignals
    .filter((signal) => signal.rawEffect.startsWith('{'))
  assert.deepEqual(
    garbageUnsupported.map((signal) => signal.rawEffect),
    [],
    `CNE 伪 JSON effectReference 不应产生垃圾 unsupported：${JSON.stringify(heroAbilities.items[0].unsupportedSignals)}`,
  )

  // buff_upgrades wrapper（target ids 4,5）应派生 2 个信号，各指向对应 base。
  const allSignals = [...heroAbilities.items[0].carrySignals, ...heroAbilities.items[0].supportSignals]
  const derived = allSignals.filter((signal) => signal.rawEffect === 'buff_upgrades,100,4,5')
  assert.equal(derived.length, 2, `buff_upgrades 应派生 2 个信号（target 4 + 5），实际：${derived.length}`)
  const baseRawEffects = derived.map((signal) => signal.bonusScaleOfSignal?.rawEffect).sort()
  assert.deepEqual(baseRawEffects, ['hero_dps_multiplier_mult,50', 'hero_dps_multiplier_mult,80'])
})
