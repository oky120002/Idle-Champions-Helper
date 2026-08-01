import { it, expect } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { readJson } from './io-utils.ts'

import { buildModels } from './build-models.ts'
import { collectEffectEntries, normalizeEffectSignal } from './effect-helpers.ts'
import { parseEffectPayload } from '../../src/domain/effects/effect-string.ts'
import { normalizeEffectReference } from './normalize-champions.ts'

interface HeroSignal {
  rawEffect: string
  kind?: string
  value?: number
  amountFunc?: string | undefined
  stackFunc?: string | undefined
  formationCountQualifier?: unknown
  formationCountPositionQualifier?: unknown
  positionQualifier?: unknown
  targetQualifier?: unknown
  monsterTags?: string[] | undefined
  bonusScaleOfSignal?: { rawEffect: string } | undefined
}

interface HeroAbilityItem {
  heroId: string
  baseAttackDamageTypes: string[]
  baseAttackCooldown: number
  age: number
  abilityScores: { str: number; dex: number; con: number; int: number; wis: number; cha: number }
  carrySignals: HeroSignal[]
  supportSignals: HeroSignal[]
  unsupportedSignals: HeroSignal[]
  gainProfile?: { self: Record<string, number>; support: Record<string, number> }
}

interface HeroAbilities {
  updatedAt: string
  items: HeroAbilityItem[]
}

interface ScenarioItem {
  formationLayoutId: string
  slotTopology: Array<{
    slotId: string
    row: number
    column: number
    x: number
    y: number
    adjacentSlotIds: string[]
  }>
  lockedSlots: string[]
  scenarioWarnings: string[]
}

interface ScenarioModels {
  items: ScenarioItem[]
}

interface SemanticOverrideItem {
  heroId: string
  supportSignals: Array<{ kind: string; value: number; rawEffect: string }>
}

interface SemanticOverrides {
  items: SemanticOverrideItem[]
}

interface BuildModelsResult {
  heroCount: number
  scenarioCount: number
}

interface EffectEntryLike {
  effectString: string
  sourceBucket: string
  effect: { filter_targets?: unknown[] } & Record<string, unknown>
  signalPreset: HeroSignal & { value?: number | undefined; targetQualifier?: unknown }
}

interface EffectSignalResultLike {
  ok: boolean
  signal: HeroSignal
  bucket: string
}

async function setupBuildModelsOutputs(): Promise<{
  result: BuildModelsResult
  heroAbilities: HeroAbilities
  scenarioModels: ScenarioModels
  semanticOverrides: SemanticOverrides
}> {
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

  const result = (await buildModels({ versionDir, semanticOverridesFile })) as BuildModelsResult
  const heroAbilities = (await readJson(path.join(versionDir, 'hero-abilities.json'))) as HeroAbilities
  const scenarioModels = (await readJson(path.join(versionDir, 'scenarios.json'))) as ScenarioModels
  const semanticOverrides = (await readJson(path.join(versionDir, 'semantic-overrides.json'))) as SemanticOverrides

  return { result, heroAbilities, scenarioModels, semanticOverrides }
}

it('buildModels 产出 hero abilities 信号（carry/support/unsupported 全链路）', async () => {
  const { result, heroAbilities } = await setupBuildModelsOutputs()
  const first = heroAbilities.items[0]
  expect(result.heroCount).toBe(1)
  expect(result.scenarioCount).toBe(1)
  expect(heroAbilities.updatedAt).toBe('2026-06-04')
  expect(first?.heroId).toBe('1')
  expect(first?.baseAttackDamageTypes).toEqual(['magic'])
  expect(first?.baseAttackCooldown).toBe(4.5)
  expect(first?.age).toBe(40)
  expect(first?.abilityScores.str).toBe(15)
  expect(first?.carrySignals[0]?.kind).toBe('heroDpsMultiplier')
  // build 期预算收益：有 DPS carry 信号 → self.damage > 1；self/support 分层都在。
  expect(first?.gainProfile?.self?.damage).toBeGreaterThan(1)
  expect(first?.gainProfile?.support).toBeDefined()
  const perTargetCarry = first?.carrySignals.find((signal) => signal.rawEffect === 'hero_dps_mult_per_target_crusader,100,adj')
  const perTaggedCarry = first?.carrySignals.find((signal) => signal.rawEffect === 'hero_dps_mult_per_tagged_crusader_mult,200,companion')
  const perTaggedBeforeCarry = first?.supportSignals.find((signal) => signal.rawEffect === 'hero_dps_mult_per_tagged_crusader_mult_amount_before,150,wafflecrew')
  const perTargetPrebonusSupport = first?.supportSignals.find((signal) => signal.rawEffect === 'hero_dps_mult_per_target_crusader_prebonus_mult,100,adj')
  const globalSupport = first?.supportSignals.find((signal) => signal.rawEffect === 'global_dps_multiplier_mult,65')
  const taggedSupport = first?.supportSignals.find((signal) => signal.rawEffect === 'tag_dps,40')
  const statCountSupport = first?.supportSignals.find((signal) => signal.rawEffect === 'global_dps_multiplier_mult,20')
  const targetedHeroSupport = first?.supportSignals.find((signal) => signal.rawEffect === 'hero_dps_multiplier_mult,0')
  const attackTypeSupport = first?.supportSignals.find((signal) => signal.rawEffect === 'hero_dps_mult_per_crusader_mult,100')
  const behindColumnSupport = first?.supportSignals.find((signal) => signal.rawEffect === 'hero_dps_mult_per_col_behind,100')
  const perTargetAllSlotsCarry = first?.carrySignals.find((signal) => signal.rawEffect === 'hero_dps_mult_per_target_crusader_mult,100,all_slots')
  const plainBuffSupport = first?.supportSignals.find((signal) => signal.rawEffect === 'buff_upgrade,50,upgrade-base-plain')
  const taggedBuffSupport = first?.supportSignals.find((signal) => signal.rawEffect === 'buff_upgrade_per_any_tagged_crusader_mult,200,upgrade-base-tagged,evil')
  const whereBuffSupport = first?.supportSignals.find((signal) => signal.rawEffect === 'buff_upgrade_per_any_crusader_where_mult,0,1001,int,>=,15')
  const distanceBuffSupport = first?.supportSignals.find((signal) => signal.rawEffect === 'buff_upgrade_mult_by_distance_from_source_mult,400,1003')

  expect(perTargetCarry?.kind).toBe('heroDpsMultiplier')
  expect(perTargetCarry?.amountFunc).toBe('add')
  expect(perTargetCarry?.stackFunc).toBe('per_target_crusader')
  expect(perTargetCarry?.formationCountPositionQualifier).toEqual({
    relation: 'adjacent',
  })
  expect(perTaggedCarry?.amountFunc).toBe('mult')
  expect(perTaggedCarry?.stackFunc).toBe('per_tagged_crusader_mult')
  expect(perTaggedCarry?.formationCountQualifier).toEqual({
    predicate: { op: 'tag', tag: 'companion' },
  })
  expect(perTaggedBeforeCarry?.amountFunc).toBe('mult')
  expect(perTaggedBeforeCarry?.stackFunc).toBe('per_tagged_crusader_mult')
  expect(perTaggedBeforeCarry?.formationCountQualifier).toEqual({
    predicate: { op: 'tag', tag: 'wafflecrew' },
  })
  expect(perTaggedBeforeCarry?.targetQualifier).toEqual({
    predicate: { op: 'tag', tag: 'wafflecrew' },
  })
  expect(perTargetPrebonusSupport?.amountFunc).toBe('mult')
  expect(perTargetPrebonusSupport?.stackFunc).toBe('per_target_crusader')
  expect(perTargetPrebonusSupport?.formationCountPositionQualifier).toEqual({
    relation: 'adjacent',
  })
  expect(perTargetPrebonusSupport?.positionQualifier).toEqual({
    relation: 'withinTwoSlots',
  })
  expect(perTargetPrebonusSupport?.targetQualifier).toEqual({
    predicate: { op: 'stat', stat: 'dex', operator: '>=', value: 15 },
  })
  // 装备源（loot/legendary）不进 base profile 的 scored signals——加成源唯一性不变式
  // （见 simulator.md + modeling-pitfalls.md）：装备只走 owned-aware 通道（equipmentMult.ts），
  // build 管线不得 bake 装备源信号，否则与 owned 通道双重计数。
  expect(globalSupport).toBeUndefined()
  expect(taggedSupport).toBeUndefined()
  expect(statCountSupport).toBeUndefined()
  expect(targetedHeroSupport?.kind).toBe('heroDpsMultiplier')
  expect(targetedHeroSupport?.value).toBe(100)
  expect(targetedHeroSupport?.stackFunc).toBe('per_upgrade_targets')
  expect(targetedHeroSupport?.positionQualifier).toEqual({
    relation: 'nonAdjacent',
  })
  expect(attackTypeSupport?.amountFunc).toBe('mult')
  expect(attackTypeSupport?.stackFunc).toBe('per_crusader')
  expect(attackTypeSupport?.targetQualifier).toEqual({
    predicate: { op: 'attackType', attackType: 'magic', negate: false },
  })
  expect(attackTypeSupport?.formationCountQualifier).toEqual({
    predicate: { op: 'attackType', attackType: 'magic', negate: false },
  })
  expect(behindColumnSupport?.amountFunc).toBe('mult')
  expect(behindColumnSupport?.stackFunc).toBe('per_col_behind')
  expect(behindColumnSupport?.positionQualifier).toEqual({
    relation: 'allBehindColumns',
  })
  // all_slots / all 计数目标 = 全阵位计数（relation 'any'）；消费层 countQualifiedHeroes
  // 已支持 'any'（不计位置，只按 formationCountQualifier 计数）。
  // resolveCountRelation 曾因 relation==='any' 返回 null，导致全阵位 per_target_crusader
  // effect 曾被静默丢弃（已修复）。
  expect(perTargetAllSlotsCarry?.kind).toBe('heroDpsMultiplier')
  expect(perTargetAllSlotsCarry?.stackFunc).toBe('per_target_crusader')
  expect(perTargetAllSlotsCarry?.formationCountPositionQualifier).toEqual({
    relation: 'any',
  })
  // ability 源（effect_keys）plain 静态 buff_upgrade 不派生计分信号——其贡献已烘进目标 effect_def
  // 的 effect_string snapshot value（见 collectEffectEntries buff-upgrade-progression-exclusion）。
  expect(plainBuffSupport).toBeUndefined()
  // base signal（hero_dps_multiplier_mult,80）仍正常派生：
  const plainBaseSupport = first?.supportSignals.find((signal) => signal.rawEffect === 'hero_dps_multiplier_mult,80')
  expect(plainBaseSupport?.kind).toBe('heroDpsMultiplier')
  expect(taggedBuffSupport?.kind).toBe('heroDpsMultiplier')
  expect(taggedBuffSupport?.amountFunc).toBe('mult')
  expect(taggedBuffSupport?.stackFunc).toBe('per_tagged_crusader_mult')
  expect(taggedBuffSupport?.formationCountQualifier).toEqual({
    predicate: { op: 'tag', tag: 'evil' },
  })
  expect(taggedBuffSupport?.bonusScaleOfSignal?.rawEffect).toBe('hero_dps_multiplier_mult,100')
  expect(taggedBuffSupport?.targetQualifier).toEqual({
    predicate: { op: 'stat', stat: 'int', operator: '<=', value: 12 },
  })
  expect(whereBuffSupport?.kind).toBe('heroDpsMultiplier')
  expect(whereBuffSupport?.value).toBe(25)
  expect(whereBuffSupport?.amountFunc).toBe('mult')
  expect(whereBuffSupport?.stackFunc).toBe('per_crusader')
  expect(whereBuffSupport?.bonusScaleOfSignal?.rawEffect).toBe('hero_dps_multiplier_mult,60')
  expect(whereBuffSupport?.formationCountQualifier).toEqual({
    predicate: { op: 'stat', stat: 'int', operator: '>=', value: 15 },
  })
  expect(whereBuffSupport?.targetQualifier).toEqual({
    predicate: { op: 'attackType', attackType: 'magic', negate: false },
  })
  expect(distanceBuffSupport?.kind).toBe('heroDpsMultiplier')
  expect(distanceBuffSupport?.value).toBe(400)
  expect(distanceBuffSupport?.amountFunc).toBe('mult')
  expect(distanceBuffSupport?.stackFunc).toBe('per_slot_distance_from_source')
  expect(distanceBuffSupport?.bonusScaleOfSignal?.rawEffect).toBe('hero_dps_multiplier_mult,0')
  expect(distanceBuffSupport?.positionQualifier).toEqual({
    relation: 'nonAdjacent',
  })
  expect(distanceBuffSupport?.targetQualifier ?? null).toBe(null)
  expect(
    first?.unsupportedSignals
      .map((signal) => signal.rawEffect)
      .filter((rawEffect) => rawEffect !== 'effect_def'),
  ).toEqual(['pre_stack_amount', 'pre_stack_amount', 'pre_stack_amount'])
})

it('buildModels 产出 scenarios（阵型布局 + slot_escort 锁槽 + 警告）', async () => {
  const { scenarioModels } = await setupBuildModelsOutputs()
  expect(scenarioModels.items[0]?.formationLayoutId).toBe('layout-a')
  expect(scenarioModels.items[0]?.slotTopology).toEqual([
    { slotId: 's1', row: 1, column: 1, x: 40, y: 10, adjacentSlotIds: ['s2'] },
    { slotId: 's2', row: 1, column: 2, x: 20, y: 10, adjacentSlotIds: ['s1'] },
  ])
  // 9.1: slot_escort mechanic 锁定前排槽位（column 降序首槽 = s2）。
  expect(scenarioModels.items[0]?.lockedSlots).toEqual(['s2'])
  expect(
    scenarioModels.items[0]?.scenarioWarnings.some((w) => w.includes('护送任务')),
  ).toBeTruthy()
})

it('buildModels 透传 semantic overrides', async () => {
  const { semanticOverrides } = await setupBuildModelsOutputs()
  expect(semanticOverrides.items).toEqual([
    {
      heroId: '1',
      supportSignals: [
        { kind: 'adjacentBuff', value: 150, rawEffect: 'adjacent_buff,150' },
      ],
    },
  ])
})

it('effectReference 直接引用 buff_upgrade wrapper 时不进 unsupportedSignals 噪声', async () => {
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
  const heroAbilities = (await readJson(path.join(versionDir, 'hero-abilities.json'))) as HeroAbilities

  const unsupportedRawEffects = heroAbilities.items[0]?.unsupportedSignals.map((signal) => signal.rawEffect) ?? []
  expect(
    unsupportedRawEffects.filter((rawEffect) => rawEffect === 'buff_upgrade'),
  ).toEqual([])

  // upgrade effectReference 的 plain buff_upgrade 不派生计分信号（ability 源静态，贡献已在 base snapshot）。
  const first = heroAbilities.items[0]
  const allSignals = [...(first?.carrySignals ?? []), ...(first?.supportSignals ?? [])]
  const derived = allSignals.find((signal) => signal.rawEffect === 'buff_upgrade,100,4')
  expect(derived).toBeUndefined()
  // base signal 仍派生：
  expect(allSignals.find((signal) => signal.rawEffect === 'hero_dps_multiplier_mult,80')?.kind).toBe('heroDpsMultiplier')
})

it('loot buff_upgrade 派生不进 scored profile（装备源不 bake，防双重计数）', async () => {
  // 装备源 buff_upgrade 是 wrapper（放大 base upgrade 效果）。collectEffectEntries 层仍派生
  // （保留 wrapper 语义链路），但 buildHeroModels 过滤装备源不进 scored profile——加成源唯一性
  // 不变式（见 simulator.md + modeling-pitfalls.md）：装备只走 owned-aware 通道（equipmentMult.ts），
  // build 管线不得 bake 装备源信号，否则与 owned 通道双重计数。
  // 派生链路（bonusScale 指向 base）在 collectEffectEntries 层验证（见「多 rarity」test）。
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'idle-champions-loot-buff-upgrade-'))
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
          effectReference: 'effect_def,base-4',
          effectDefinition: {
            snapshots: { original: { effect_keys: [{ effect_string: 'hero_dps_multiplier_mult,80' }] } },
          },
        },
      ],
      loot: [{ id: '9001', slotId: 1, rarity: '1', effects: [{ effect_string: 'buff_upgrade,100,4' }] }],
      legendaryEffects: [],
    }),
  )

  await buildModels({ versionDir, semanticOverridesFile: path.join(tempDir, 'empty.json') })
  const heroAbilities = (await readJson(path.join(versionDir, 'hero-abilities.json'))) as HeroAbilities

  // loot buff_upgrade 派生不进 scored profile——装备源不 bake（加成源唯一性不变式）。
  const first = heroAbilities.items[0]
  const allSignals = [...(first?.carrySignals ?? []), ...(first?.supportSignals ?? [])]
  const derived = allSignals.find((signal) => signal.rawEffect === 'buff_upgrade,100,4')
  expect(derived).toBeUndefined()
})

it('collectEffectEntries loot buff_upgrade 多 rarity 同信号位取最高 magnitude', () => {
  // IC 装备每槽只装备一件（最高 rarity）；loot 源 upgradeId=null → 同信号位多 rarity 去重时
  // 应取最大 magnitude（保守上界），而非首条（最低 rarity）。
  // 真实例：蔚时髦披肩 slot2 rarity1(+25%)/rarity2(+50%)/rarity4(+157.8%)，原取 rarity1 +25% 欠估。
  const detail = {
    upgrades: [
      {
        id: '4',
        effectReference: 'effect_def,base-4',
        effectDefinition: {
          snapshots: { original: { effect_keys: [{ effect_string: 'hero_dps_multiplier_mult,80' }] } },
        },
      },
    ],
    loot: [
      { id: '9001', slotId: 1, rarity: '1', effects: [{ effect_string: 'buff_upgrade,25,4' }] },
      { id: '9002', slotId: 1, rarity: '2', effects: [{ effect_string: 'buff_upgrade,50,4' }] },
      { id: '9003', slotId: 1, rarity: '4', effects: [{ effect_string: 'buff_upgrade,157.8,4' }] },
    ],
    legendaryEffects: [],
    feats: [],
  }
  const entries = collectEffectEntries(detail).entries as EffectEntryLike[]
  // 装备源 wrapper 派生透传原始 sourceBucket='loot'（非统一别名），保证 buildHeroModels 源过滤能拦截。
  // signalPreset!=null 区分派生 wrapper 与原始 loot entry（后者无 preset）。
  const derived = entries.filter(
    (entry) => entry.sourceBucket === 'loot' && entry.signalPreset != null && entry.effectString.startsWith('buff_upgrade,'),
  )
  // 三 rarity 同信号位去重为 1 条，且保留最高 magnitude（157.8）。
  expect(derived).toHaveLength(1)
  expect(derived[0]?.effectString).toBe('buff_upgrade,157.8,4')
  expect(derived[0]?.signalPreset.value).toBe(157.8)
  // 派生 wrapper 的 bonusScaleOfSignal 指向 base ability signal（保留 wrapper 语义链路）。
  expect(derived[0]?.signalPreset?.bonusScaleOfSignal?.rawEffect).toBe('hero_dps_multiplier_mult,80')
})

it('amount_expr 跨 upgrade 引用按 upgrade id 解析目标 effect（非当前 upgrade）', async () => {
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
  const heroAbilities = (await readJson(path.join(versionDir, 'hero-abilities.json'))) as HeroAbilities

  // upgrade A 的 hero_dps_multiplier_mult，value 必须从 upgrade B 取（200），不是 upgrade A 的 pre_stack_amount（50）
  const first = heroAbilities.items[0]
  const allSignals = [...(first?.carrySignals ?? []), ...(first?.supportSignals ?? [])]
  const crossRefSignal = allSignals.find((signal) => signal.rawEffect === 'hero_dps_multiplier_mult,0')
  expect(crossRefSignal?.value).toBe(200)
})

it('loot buff_upgrades wrapper 派生多 target base 信号（collectEffectEntries 层）', () => {
  // loot buff_upgrades（带 s）多 target id（4,5）→ 派生 2 个信号各指向对应 base。
  // 装备源派生在 collectEffectEntries 层产出（保留 wrapper 语义链路），buildHeroModels 过滤不进
  // scored profile（加成源唯一性不变式，见 simulator.md + modeling-pitfalls.md）。
  const detail = {
    upgrades: [
      { id: '4', effectReference: 'effect_def,b4', effectDefinition: { snapshots: { original: { effect_keys: [{ effect_string: 'hero_dps_multiplier_mult,80' }] } } } },
      { id: '5', effectReference: 'effect_def,b5', effectDefinition: { snapshots: { original: { effect_keys: [{ effect_string: 'hero_dps_multiplier_mult,50' }] } } } },
    ],
    loot: [{ effects: [{ effect_string: 'buff_upgrades,100,4,5' }] }],
    legendaryEffects: [],
    feats: [],
  }
  const entries = collectEffectEntries(detail).entries as EffectEntryLike[]
  const derived = entries.filter(
    (entry) => entry.sourceBucket === 'loot' && entry.signalPreset != null && entry.effectString === 'buff_upgrades,100,4,5',
  )
  expect(derived).toHaveLength(2)
  const baseRawEffects = derived.map((entry) => entry.signalPreset?.bonusScaleOfSignal?.rawEffect).sort()
  expect(baseRawEffects).toEqual(['hero_dps_multiplier_mult,50', 'hero_dps_multiplier_mult,80'])
})

it('normalizeEffectReference 提取 CNE effect 对象串的 effect_string（CI 守护）', () => {
  // normalize 层是 CNE effect 伪 JSON 处理的 single source——消费层 parseEffectPayload 已不处理
  // JSON（见 effect-string.ts），依赖 normalize 产出干净标准串。此守护确保该链路有 CI 覆盖。
  // 完整 normalize 守护见 normalize-*.test.mjs（待接入 test:data，受 affiliations 测试隔离阻塞）。
  expect(normalizeEffectReference('{"effect_string":"buff_upgrade,100,4","description":"x"}')).toBe('buff_upgrade,100,4')
  expect(
    normalizeEffectReference('{\n"effect_string":"buff_upgrades,100,4,5"\n"description":"missing comma"}'),
  ).toBe('buff_upgrades,100,4,5')
  expect(normalizeEffectReference('hero_dps_multiplier_mult,100')).toBe('hero_dps_multiplier_mult,100')
  expect(normalizeEffectReference(null)).toBe(null)
})

it('collectEffectEntries 收集 feat effects（与 loot/legendary 对称，理论最大基线）', () => {
  // feat 是英雄专属固定能力（per-hero），其 global/hero_dps 加成应与 loot/legendary
  // 一样进入理论最大 carryDps 基线；此前 collectRawEffectEntries 漏遍历 detail.feats，
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
  const entries = collectEffectEntries(detail).entries as EffectEntryLike[]
  const featEntries = entries.filter((entry) => entry.sourceBucket === 'feat')
  const effectStrings = featEntries.map((entry) => entry.effectString).sort()
  expect(effectStrings).toEqual(['global_dps_multiplier_mult,10', 'hero_dps_multiplier_mult,100'])
  // hero_expr 限定随 entry.effect 流入，消费层 attachSignalSemantics 正确处理。
  const heroDpsEntry = featEntries.find((entry) => entry.effectString === 'hero_dps_multiplier_mult,100')
  expect(heroDpsEntry?.effect.filter_targets).toEqual([{ type: 'hero_expr', hero_expr: 'HasTag(`dwarf`)' }])
})

it('collectEffectEntries 收集 ability effects', () => {
  // detail.ability.effects 是 normalize 层折算后的 effect_string 列表（value × uptime）。
  // collectRawEffectEntries 加第六源 'ability' 收集，与 loot/legendary/feat 同结构进理论基线。
  const detail = {
    upgrades: [],
    loot: [],
    legendaryEffects: [],
    feats: [],
    ability: {
      id: '1',
      duration: 30,
      baseCooldown: 3600,
      effects: ['global_dps_multiplier_mult,0.8333333333333333', 'do_nothing'],
    },
  }
  const entries = collectEffectEntries(detail).entries as EffectEntryLike[]
  const abilityEntries = entries.filter((entry) => entry.sourceBucket === 'ability')
  const effectStrings = abilityEntries.map((entry) => entry.effectString).sort()
  expect(effectStrings).toEqual(['do_nothing', 'global_dps_multiplier_mult,0.8333333333333333'])
  // duration/baseCooldown 随 entry.effect 流入（供消费层 modron gating 按玩家状态）。
  const dpsEntry = abilityEntries.find((entry) => entry.effectString.startsWith('global_dps_multiplier_mult,'))
  expect(dpsEntry?.effect.duration).toBe(30)
  expect(dpsEntry?.effect.baseCooldown).toBe(3600)
})

it('collectEffectEntries ability 源静态 buff_upgrade 不派生（贡献已在 base effect_def snapshot）', () => {
  // IC effect_def effect_string 是满级 snapshot 计算值，已含该 ability 自身 upgrade 树的全部静态
  // buff_upgrade 贡献——不论 ranked 进阶（不同 required_level 的「真升级」）还是 sentinel（required_level=9999
  // 的 CNE 展开副本）。证据：蔚善良榜样 effect_string=300 含 20 条 ranked buff_upgrade,100,12312 +
  // 劝人向善 buff_upgrade,200,12312，游戏显示 per-stack 恰好 +300%（4^7=16384），叠层系数 2.92e7 只含
  // 2 个外部修饰器。旧代码按 required_level 区分（sentinel 去重 / 真升级全叠加），假设「真升级全部叠加」，
  // 对同一 base 多条派生独立 +base.value×X/100 addPercent → 蔚 damage:hero pool 22× 高估。
  // 修正：ability 源静态 plain buff_upgrade 不论 required_level 高低、magnitude 异同，均不派生。
  // 仅 stacks_multiply 动态（area 依赖）、复杂 wrapper（阵型依赖）、外部源 loot/feat/legendary 派生。
  const detail = {
    upgrades: [
      {
        id: '4',
        requiredLevel: 50,
        effectReference: 'effect_def,b4',
        effectDefinition: { snapshots: { original: { effect_keys: [{ effect_string: 'hero_dps_multiplier_mult,100' }] } } },
      },
      // 真升级（required_level<9999，不同 magnitude）：
      { id: '7', requiredLevel: 150, effectReference: 'buff_upgrade,100,4', effectDefinition: null },
      { id: '12', requiredLevel: 300, effectReference: 'buff_upgrade,300,4', effectDefinition: null },
      { id: '15', requiredLevel: 500, effectReference: 'buff_upgrade,200,4', effectDefinition: null },
      // sentinel（required_level=9999，相同与不同 magnitude）：
      { id: '8', requiredLevel: 9999, effectReference: 'buff_upgrades,100,4', effectDefinition: null },
      { id: '9', requiredLevel: 9999, effectReference: 'buff_upgrades,200,4', effectDefinition: null },
    ],
    loot: [],
    legendaryEffects: [],
    feats: [],
  }
  const entries = collectEffectEntries(detail).entries as EffectEntryLike[]
  // ability 源静态 buff_upgrade 全部不派生（不论 required_level、magnitude、单复数）。
  // 透传后派生 sourceBucket=原始 wrapper 来源；ability 源 buff_upgrade 静态被排除，无派生 wrapper。
  const derived = entries.filter((entry) =>
    (entry.sourceBucket === 'upgrade' || entry.sourceBucket === 'upgrade-effect-key')
    && entry.signalPreset != null
    && entry.effectString.startsWith('buff_upgrade'),
  )
  expect(derived).toHaveLength(0)
  // base signal 仍正常派生：
  expect(entries.some((entry) => entry.effectString === 'hero_dps_multiplier_mult,100')).toBe(true)
})

it('collectEffectEntries static_dps_mult fallback：复杂 effect 进 unsupported 时用 CNE 静态近似', () => {
  // upgrade 带 static_dps_mult（CNE 静态 dps 乘数近似），其 effect 是复杂机制
  // （target_attacking_monsters_hero_dps_mult 等）resolveDpsSignal 无 parser → 进 unsupported；
  // static_dps_mult 接管，生成 heroDpsMultiplier mult signal（carryDps self-buff），避免 dps 丢失。
  // 35 个 upgrade 受此影响（static_dps_mult 是 CNE 静态 dps 乘数近似，见 simulator.md「加成聚合与 DPS 公式」）。
  const detail = {
    upgrades: [
      {
        id: '10',
        staticDpsMult: '4',
        effectReference: 'target_attacking_monsters_hero_dps_mult,100,10',
        effectDefinition: null,
      },
    ],
    loot: [],
    legendaryEffects: [],
    feats: [],
  }
  const entries = collectEffectEntries(detail).entries as EffectEntryLike[]
  const fallback = entries.filter((entry) => entry.sourceBucket === 'static-dps')
  expect(fallback.length).toBe(1)
  expect(fallback[0]?.signalPreset.kind).toBe('heroDpsMultiplier')
  expect(fallback[0]?.signalPreset.value).toBe(300) // (4-1)*100 → mult 后 =4×
  expect(fallback[0]?.signalPreset.amountFunc).toBe('mult')
})

it('collectEffectEntries static_dps_mult 不与可解析 effect 重复（防双重计算）', () => {
  // upgrade 的 effect 可解析（hero_dps_multiplier_mult,100）时，static_dps_mult 不 fallback，
  // 否则 effect signal + static_dps_mult signal 双重计算（高估）。
  const detail = {
    upgrades: [
      {
        id: '11',
        staticDpsMult: '4',
        effectReference: 'hero_dps_multiplier_mult,100',
        effectDefinition: null,
      },
    ],
    loot: [],
    legendaryEffects: [],
    feats: [],
  }
  const entries = collectEffectEntries(detail).entries as EffectEntryLike[]
  const fallback = entries.filter((entry) => entry.sourceBucket === 'static-dps')
  expect(fallback.length).toBe(0)
  // effect signal 仍在（可解析，未丢失）
  const dps = entries.filter((entry) => entry.effectString === 'hero_dps_multiplier_mult,100')
  expect(dps.length).toBe(1)
})

it('collectEffectEntries loot buff_upgrade wrapper 合并 wrapper 自身 filter_targets', () => {
  // wrapper 自身的 filter_targets（如 hero_ids 白名单）限定 buff 只对特定英雄生效；
  // preset 须合并 wrapper filter_targets 到 targetQualifier，避免 wrapper 层 targeting 丢失。
  // ability 源 buff_upgrade 不派生（snapshot 已含），故用 loot 外部源验证合并链路仍工作。
  const detail = {
    upgrades: [
      { id: '4', effectReference: 'effect_def,b4', effectDefinition: { snapshots: { original: { effect_keys: [{ effect_string: 'hero_dps_multiplier_mult,100' }] } } } },
    ],
    loot: [{
      id: '9001',
      slotId: 1,
      rarity: '1',
      effects: [{ effect_string: 'buff_upgrades,100,4', filter_targets: [{ type: 'hero_ids', hero_ids: [82] }] }],
    }],
    legendaryEffects: [],
    feats: [],
  }
  const entries = collectEffectEntries(detail).entries as EffectEntryLike[]
  // loot 源 wrapper 派生透传 sourceBucket='loot'；signalPreset 区分派生与原始 entry。
  const derived = entries.filter((entry) => entry.sourceBucket === 'loot' && entry.signalPreset != null)
  expect(derived.length).toBe(1)
  // wrapper 的 hero_ids 限定合并到 derived signal 的 targetQualifier（base 无 filter → 直接取 wrapper 限定）。
  expect(derived[0]?.signalPreset.targetQualifier).toEqual({
    predicate: { op: 'heroId', heroId: '82', negate: false },
  })
})

it('normalizeEffectSignal 解析 gold multiplier effect', () => {
  // gold_multiplier_mult → globalGoldMultiplier（全队金币池，supportSignals）
  const plain = normalizeEffectSignal('gold_multiplier_mult', '200', 'official-parsed', {}) as EffectSignalResultLike
  expect(plain.ok).toBe(true)
  expect(plain.signal.kind).toBe('globalGoldMultiplier')
  expect(plain.signal.value).toBe(200)
  expect(plain.bucket).toBe('supportSignals')

  // gold_mult_per_tagged_crusader_mult → globalGoldMultiplier + per_tagged stackFunc
  // 镜像 hero_dps_mult_per_tagged_crusader_mult 解析模式。
  const taggedPayload = parseEffectPayload('gold_mult_per_tagged_crusader_mult,100,companion')
  const tagged = normalizeEffectSignal(
    'gold_mult_per_tagged_crusader_mult',
    '100',
    'official-parsed',
    { effectPayload: taggedPayload, effect: {} },
  ) as EffectSignalResultLike
  expect(tagged.ok).toBe(true)
  expect(tagged.signal.kind).toBe('globalGoldMultiplier')
  expect(tagged.signal.amountFunc).toBe('mult')
  expect(tagged.signal.stackFunc).toBe('per_tagged_crusader_mult')
  expect(tagged.signal.formationCountQualifier).toEqual({
    predicate: { op: 'tag', tag: 'companion' },
  })

  // 非法 value 仍 unsupported（不绕过数值守卫）
  const bad = normalizeEffectSignal('gold_multiplier_mult', 'abc', 'official-parsed', {}) as EffectSignalResultLike
  expect(bad.ok).toBe(false)
})

it('normalizeEffectSignal 解析 crit effect', () => {
  // chance add 无 target → heroCritChance / carrySignals（自身暴击；与 hero_dps 一致）
  const chanceAdd = normalizeEffectSignal('buff_base_crit_chance_add', '35', 'official-parsed', {}) as EffectSignalResultLike
  expect(chanceAdd.ok).toBe(true)
  expect(chanceAdd.signal.kind).toBe('heroCritChance')
  expect(chanceAdd.signal.value).toBe(35)
  expect(chanceAdd.bucket).toBe('carrySignals')

  // chance add 带 targets:["all"] → supportSignals（光环，如「所有同伴暴击+」）
  const chanceAddAura = normalizeEffectSignal('buff_base_crit_chance_add', '20', 'official-parsed', {
    effect: { targets: ['all'] },
  }) as EffectSignalResultLike
  expect(chanceAddAura.ok).toBe(true)
  expect(chanceAddAura.bucket).toBe('supportSignals')

  // chance mult → heroCritChance + amountFunc mult
  const chanceMult = normalizeEffectSignal('buff_base_crit_chance_mult', '50', 'official-parsed', {}) as EffectSignalResultLike
  expect(chanceMult.signal.kind).toBe('heroCritChance')
  expect(chanceMult.signal.amountFunc).toBe('mult')

  // damage add → heroCritDamage
  const dmgAdd = normalizeEffectSignal('buff_base_crit_damage', '9', 'official-parsed', {}) as EffectSignalResultLike
  expect(dmgAdd.signal.kind).toBe('heroCritDamage')
  expect(dmgAdd.signal.amountFunc).toBe(undefined)

  // damage mult → heroCritDamage mult
  const dmgMult = normalizeEffectSignal('buff_base_crit_damage_mult', '15', 'official-parsed', {}) as EffectSignalResultLike
  expect(dmgMult.signal.kind).toBe('heroCritDamage')
  expect(dmgMult.signal.amountFunc).toBe('mult')

  // global chance/damage → 全队 supportSignals
  const gChance = normalizeEffectSignal('global_buff_base_crit_chance_add', '10', 'official-parsed', {}) as EffectSignalResultLike
  expect(gChance.signal.kind).toBe('globalCritChance')
  expect(gChance.bucket).toBe('supportSignals')
  const gDmgAdd = normalizeEffectSignal('global_buff_base_crit_damage_add', '12', 'official-parsed', {}) as EffectSignalResultLike
  expect(gDmgAdd.signal.kind).toBe('globalCritDamage')
  expect(gDmgAdd.signal.amountFunc).toBe(undefined)
  const gDmgMult = normalizeEffectSignal('global_buff_base_crit_damage_mult', '20', 'official-parsed', {}) as EffectSignalResultLike
  expect(gDmgMult.signal.kind).toBe('globalCritDamage')
  expect(gDmgMult.signal.amountFunc).toBe('mult')

  // 非法 value 仍 unsupported
  const bad = normalizeEffectSignal('buff_base_crit_chance_add', 'xyz', 'official-parsed', {}) as EffectSignalResultLike
  expect(bad.ok).toBe(false)
})

it('normalizeEffectSignal 解析 health/healing/damage_reduction effect', () => {
  // health_mult 无 target → heroHealthMultiplier / carrySignals（自身生命）
  const healthMult = normalizeEffectSignal('health_mult', '100', 'official-parsed', {}) as EffectSignalResultLike
  expect(healthMult.ok).toBe(true)
  expect(healthMult.signal.kind).toBe('heroHealthMultiplier')
  expect(healthMult.bucket).toBe('carrySignals')

  // health_mult 带 targets:["all"] → supportSignals（光环）
  const healthAura = normalizeEffectSignal('health_mult', '100', 'official-parsed', {
    effect: { targets: ['all'] },
  }) as EffectSignalResultLike
  expect(healthAura.ok).toBe(true)
  expect(healthAura.bucket).toBe('supportSignals')

  const incHealth = normalizeEffectSignal('increase_health_by_source_percent', '50', 'official-parsed', {}) as EffectSignalResultLike
  expect(incHealth.signal.kind).toBe('heroHealthMultiplier')

  const healing = normalizeEffectSignal('healing_mult', '30', 'official-parsed', {}) as EffectSignalResultLike
  expect(healing.signal.kind).toBe('heroHealthMultiplier')

  const gHealing = normalizeEffectSignal('global_healing_mult', '20', 'official-parsed', {}) as EffectSignalResultLike
  expect(gHealing.signal.kind).toBe('globalHealthMultiplier')

  const dmgRed = normalizeEffectSignal('damage_reduction', '15', 'official-parsed', {}) as EffectSignalResultLike
  expect(dmgRed.signal.kind).toBe('damageReduction')
  expect(dmgRed.signal.amountFunc).toBe(undefined)
  expect(dmgRed.bucket).toBe('supportSignals')

  const dmgRedMult = normalizeEffectSignal('trials_damage_reduction_mult', '25', 'official-parsed', {}) as EffectSignalResultLike
  expect(dmgRedMult.signal.kind).toBe('damageReduction')
  expect(dmgRedMult.signal.amountFunc).toBe('mult')

  // 非法 value 仍 unsupported
  expect((normalizeEffectSignal('health_mult', 'bad', 'official-parsed', {}) as EffectSignalResultLike).ok).toBe(false)
})

it('normalizeEffectSignal 解析 vulnerability effect', () => {
  // 无条件 vulnerability
  const di = normalizeEffectSignal('damage_increase', '50', 'official-parsed', {}) as EffectSignalResultLike
  expect(di.ok).toBe(true)
  expect(di.signal.kind).toBe('enemyVulnerability')
  expect(di.signal.monsterTags ?? null).toBe(null)

  const against = normalizeEffectSignal('increase_damage_against_monster', '30', 'official-parsed', {}) as EffectSignalResultLike
  expect(against.signal.kind).toBe('enemyVulnerability')
  expect(against.signal.monsterTags ?? null).toBe(null)

  // 按 monster tag（词表与 variant.enemyTypes 一致，| 为 OR）
  const tagPayload = parseEffectPayload('increase_damage_against_monster_tag,300,fiend')
  const tag = normalizeEffectSignal('increase_damage_against_monster_tag', '300', 'official-parsed', { effectPayload: tagPayload, effect: {} }) as EffectSignalResultLike
  expect(tag.signal.kind).toBe('enemyVulnerability')
  expect(tag.signal.monsterTags).toEqual(['fiend'])

  // OR 列表
  const tagPayload2 = parseEffectPayload('increase_damage_against_monster_tag,200,humanoid|beast|undead')
  const tag2 = normalizeEffectSignal('increase_damage_against_monster_tag', '200', 'official-parsed', { effectPayload: tagPayload2, effect: {} }) as EffectSignalResultLike
  expect(tag2.signal.monsterTags).toEqual(['humanoid', 'beast', 'undead'])

  // armored 条件
  const armored = normalizeEffectSignal('increase_armored_damage', '40', 'official-parsed', {}) as EffectSignalResultLike
  expect(armored.signal.kind).toBe('enemyVulnerability')
  expect(armored.signal.monsterTags).toEqual(['armored'])

  // 非法 value 仍 unsupported
  expect((normalizeEffectSignal('damage_increase', 'bad', 'official-parsed', {}) as EffectSignalResultLike).ok).toBe(false)
})

it('normalizeEffectSignal 解析 speed/cooldown effect', () => {
  const atkSpeed = normalizeEffectSignal('base_attack_speed_mult', '20', 'official-parsed', {}) as EffectSignalResultLike
  expect(atkSpeed.signal.kind).toBe('attackSpeedMult')
  expect(atkSpeed.signal.amountFunc).toBe('mult')

  const reduceAtk = normalizeEffectSignal('reduce_attack_cooldown', '15', 'official-parsed', {}) as EffectSignalResultLike
  expect(reduceAtk.signal.kind).toBe('attackSpeedMult')
  expect(reduceAtk.signal.amountFunc).toBe(undefined)

  const reduceUlt = normalizeEffectSignal('reduce_ultimate_cooldown', '10', 'official-parsed', {}) as EffectSignalResultLike
  expect(reduceUlt.signal.kind).toBe('cooldownReduction')

  const ablCd = normalizeEffectSignal('ability_cooldown_reduction_mult', '25', 'official-parsed', {}) as EffectSignalResultLike
  expect(ablCd.signal.kind).toBe('cooldownReduction')
  expect(ablCd.signal.amountFunc).toBe('mult')

  expect((normalizeEffectSignal('base_attack_speed_mult', 'bad', 'official-parsed', {}) as EffectSignalResultLike).ok).toBe(false)
})
