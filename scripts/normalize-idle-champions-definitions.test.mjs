import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { normalizeDefinitionsSnapshot } from './normalize-idle-champions-definitions.mjs'
import { normalizeEffectReference } from './data/normalize-champions.mjs'

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

test('normalizeDefinitionsSnapshot 输出官方原文和中文展示双字段', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'idle-champions-normalize-'))
  const outputDir = path.join(tempDir, 'data')
  const versionFile = path.join(tempDir, 'version.json')

  await normalizeDefinitionsSnapshot({
    input: path.resolve('scripts/fixtures/mock-definitions.json'),
    localizedInput: path.resolve('scripts/fixtures/mock-definitions-zh.json'),
    outputDir,
    versionFile,
  })

  const champions = await readJson(path.join(outputDir, 'champions.json'))
  const adventures = await readJson(path.join(outputDir, 'adventures.json'))
  const patrons = await readJson(path.join(outputDir, 'patrons.json'))
  const gameRules = await readJson(path.join(outputDir, 'game-rules.json'))
  const effectReference = await readJson(path.join(outputDir, 'effect-reference.json'))
  const patronPerks = await readJson(path.join(outputDir, 'patron-perks.json'))
  const trials = await readJson(path.join(outputDir, 'trials.json'))
  const variants = await readJson(path.join(outputDir, 'variants.json'))
  const enums = await readJson(path.join(outputDir, 'enums.json'))
  const bruenorDetail = await readJson(path.join(outputDir, 'champion-details', '1.json'))
  const version = await readJson(versionFile)

  assert.deepEqual(champions.items[0].name, {
    original: 'Bruenor',
    display: '布鲁诺',
  })
  assert.deepEqual(champions.items[1].name, {
    original: 'Hew Maan',
    display: 'Hew Maan',
  })
  assert.deepEqual(champions.items[0].affiliations, [
    {
      original: 'Companions of the Hall',
      display: '秘银五侠',
    },
  ])
  assert.deepEqual(champions.items[0].patronEligibility, {
    eligiblePatronIds: ['1', '2', '5'],
    ruleQualifiedPatronIds: ['1', '2', '5'],
    forcedEligiblePatronIds: [],
    unsupportedPatronIds: [],
  })
  assert.deepEqual(champions.items[1].patronEligibility, {
    eligiblePatronIds: ['5'],
    ruleQualifiedPatronIds: [],
    forcedEligiblePatronIds: ['5'],
    unsupportedPatronIds: [],
  })
  assert.deepEqual(bruenorDetail.loot, [
    {
      id: '1001',
      name: {
        original: 'Simple Shield',
        display: '简单盾牌',
      },
      description: {
        original: 'A steady shield for testing.',
        display: '用于测试的稳固盾牌。',
      },
      graphicId: '2001',
      slotId: 1,
      rarity: '3',
      maxLevel: [500, 250, 125],
      effects: [
        {
          effect_string: 'hero_dps_multiplier_mult,100',
        },
      ],
      allowGoldenEpic: true,
      isGoldenEpic: false,
    },
    {
      id: '1002',
      name: {
        original: 'Golden Shield',
        display: '黄金盾牌',
      },
      description: {
        original: 'A golden shield for testing.',
        display: '用于测试的黄金盾牌。',
      },
      graphicId: '2002',
      slotId: 1,
      rarity: '4',
      maxLevel: [500, 250, 125],
      effects: [
        {
          effect_string: 'hero_dps_multiplier_mult,200',
        },
      ],
      allowGoldenEpic: true,
      isGoldenEpic: true,
    },
  ])
  assert.deepEqual(bruenorDetail.legendaryEffects, [
    {
      id: '501',
      slotId: 1,
      effects: [
        {
          effect_string: 'increase_global_dps_mult,100',
        },
      ],
    },
    {
      id: '502',
      slotId: 2,
      effects: [
        {
          effect_string: 'increase_health_mult,50',
        },
      ],
    },
  ])
  assert.equal(bruenorDetail.raw.loot.length, 2)
  assert.equal(bruenorDetail.raw.legendaryEffects.length, 2)

  assert.deepEqual(adventures.items[0], {
    id: '100',
    ruleContextId: 'adventure:100',
    scenarioKind: 'adventure',
    name: {
      original: 'The Test Adventure',
      display: '测试冒险',
    },
    campaign: {
      id: '1',
      original: 'A Grand Tour of the Sword Coast',
      display: '剑湾之旅',
    },
    description: {
      original: 'Test the base adventure contract.',
      display: '测试基础冒险合同。',
    },
    objectiveArea: 50,
    locationId: '8',
    areaSetId: '55',
    scene: {
      id: '1:8',
      original: 'The Test Adventure',
      display: '测试冒险',
    },
    requirements: [
      {
        original: 'Complete tutorial',
        display: '完成教学',
      },
    ],
    restrictions: [],
    rewards: [
      {
        original: 'Unlock free play',
        display: '解锁自由刷图',
      },
    ],
    repeatable: true,
    patronObjectiveTiers: [
      {
        patronId: '1',
        tierId: '1',
        objectiveArea: 250,
        objectives: [
          {
            condition: 'complete_area',
            area: '250',
          },
        ],
      },
    ],
    modeTags: ['adventure', 'free_play', 'patron'],
    mechanics: [],
  })
  assert.deepEqual(patrons.items.map((item) => item.id), ['1', '2', '5'])
  assert.deepEqual(patrons.items.find((item) => item.id === '1'), {
    id: '1',
    name: {
      original: 'Mirt the Moneylender',
      display: '米尔特',
    },
    description: {
      original: 'Only Good or Evil Champions can be used.',
      display: '只能使用善良或邪恶阵营的勇士。',
    },
    shortName: 'Mirt',
    restrictionsText: [
      {
        original: 'Only Good or Evil Champions can be used',
        display: '只能使用善良或邪恶阵营的勇士',
      },
    ],
    minObjectiveLevel: 250,
    defaultObjectiveBump: 100,
    weeklyFreePlayCap: 5000,
    forceAllowedHeroIds: [],
    eligibilityRules: [
      {
        type: 'tags',
        rawExpression: '!(good|evil)',
        requiredAnyTags: ['good', 'evil'],
        supported: true,
      },
    ],
    evaluationStatus: 'complete',
  })
  assert.deepEqual(gameRules.items[0], {
    id: '1',
    ruleName: 'role_tags_v2',
    topLevelKeys: ['enabled', 'tags'],
    rule: {
      tags: ['support', 'tank', 'speed'],
      enabled: true,
    },
  })
  assert.deepEqual(effectReference.stats[0], {
    id: '7',
    name: 'hero_level',
    multiKey: false,
    clearOnReset: true,
    serverOnly: false,
    readOnly: true,
    properties: null,
  })
  assert.deepEqual(effectReference.buffs[0], {
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
  assert.deepEqual(effectReference.effectKeys[1], {
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
  assert.deepEqual(patronPerks.tiers, [
    {
      id: '1',
      patronId: '1',
      tierId: '1',
      requiredPurchasedPerkCount: null,
      requirements: [],
    },
    {
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
    },
  ])
  assert.deepEqual(patronPerks.perks[1], {
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
  assert.deepEqual(trials.roles[0], {
    id: '1',
    name: {
      original: 'Forest - Balance the Forest',
      display: '森林--森林重归平衡',
    },
    description: {
      original: 'Liberate the forest near the Sunset Mountains.',
      display: '解救落日山脉附近的森林。',
    },
    graphicId: '11042',
    adventureId: '100',
    scenarioKind: 'adventure',
    ruleContextId: 'adventure:100',
    adventure: {
      id: '100',
      name: {
        original: 'The Test Adventure',
        display: '测试冒险',
      },
      campaign: {
        id: '1',
        original: 'A Grand Tour of the Sword Coast',
        display: '剑湾之旅',
      },
      objectiveArea: 50,
      locationId: '8',
      areaSetId: '55',
    },
    position: {
      x: 356,
      y: 518,
    },
  })
  assert.deepEqual(trials.difficulties[1], {
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
      {
        costType: 'trials_difficulty_token',
        difficultyTokenId: 'any',
        amount: 1,
      },
    ],
    rewardData: [
      {
        deprecated: 'do not use',
      },
    ],
  })

  assert.deepEqual(variants.items[0].name, {
    original: 'A Test Variant',
    display: '测试变体',
  })
  assert.equal(variants.items[0].ruleContextId, 'variant:101')
  assert.equal(variants.items[0].scenarioKind, 'variant')
  assert.deepEqual(variants.items[0].modeTags, ['variant', 'patron'])
  assert.deepEqual(variants.items[0].patronObjectiveTiers, [
    {
      patronId: '2',
      tierId: '1',
      objectiveArea: 275,
      objectives: [
        {
          condition: 'complete_area',
          area: '275',
        },
      ],
    },
  ])
  assert.deepEqual(variants.items[0].campaign, {
    id: '1',
    original: 'A Grand Tour of the Sword Coast',
    display: '剑湾之旅',
  })
  assert.deepEqual(variants.items[0].adventure, {
    original: 'The Test Adventure',
    display: '测试冒险',
  })
  assert.equal(variants.items[0].adventureId, '100')
  assert.equal(variants.items[0].objectiveArea, 75)
  assert.equal(variants.items[0].locationId, '8')
  assert.equal(variants.items[0].areaSetId, '55')
  assert.deepEqual(variants.items[0].scene, {
    id: '1:8',
    original: 'The Test Adventure',
    display: '测试冒险',
  })
  assert.deepEqual(variants.items[0].restrictions, [
    {
      original: 'Only champions with 14+ CON',
      display: '只能使用体质 14+ 的勇士',
    },
  ])
  assert.equal(variants.items[0].enemyCount, 3)
  assert.deepEqual(variants.items[0].enemyTypes, ['humanoid', 'bandit', 'undead'])
  assert.deepEqual(variants.items[0].enemyTypeCounts, {
    humanoid: 2,
    bandit: 1,
    undead: 1,
  })
  assert.deepEqual(variants.items[0].attackMix, {
    melee: 2,
    ranged: 1,
    magic: 0,
    other: 0,
  })
  assert.equal(variants.items[0].specialEnemyCount, 3)
  assert.equal(variants.items[0].escortCount, 2)
  assert.deepEqual(variants.items[0].areaMilestones, [1, 51, 75])
  assert.deepEqual(variants.items[0].areaHighlights, [
    {
      id: 'slot_escort_by_area:1:open:loop:repeat',
      kind: 'slot_escort_by_area',
      start: 1,
      end: null,
      loopAt: null,
      repeatAt: null,
    },
    {
      id: 'slot_escort_by_area:51:open:loop:repeat',
      kind: 'slot_escort_by_area',
      start: 51,
      end: null,
      loopAt: null,
      repeatAt: null,
    },
  ])
  assert.deepEqual(variants.items[0].mechanics, ['random_monster', 'slot_escort_by_area'])

  assert.deepEqual(enums.items[1], {
    id: 'affiliations',
    values: [
      {
        original: 'Rivals of Waterdeep',
        display: '深水城宿敌',
      },
      {
        original: 'Companions of the Hall',
        display: '秘银五侠',
      },
    ],
  })
  assert.deepEqual(enums.items[2], {
    id: 'campaigns',
    values: [
      {
        id: '1',
        original: 'A Grand Tour of the Sword Coast',
        display: '剑湾之旅',
      },
      {
        id: '2',
        original: 'Tomb of Annihilation',
        display: '湮灭之墓',
      },
    ],
  })
  assert.deepEqual(enums.items[3], {
    id: 'patrons',
    values: [
      {
        id: '1',
        original: 'Mirt the Moneylender',
        display: '米尔特',
      },
      {
        id: '2',
        original: 'Vajra Safahr',
        display: '瓦吉拉',
      },
      {
        id: '5',
        original: 'Elminster',
        display: '艾尔明斯特',
      },
    ],
  })
  assert.deepEqual(enums.items[4], {
    id: 'modes',
    values: ['adventure', 'free_play', 'patron', 'variant'],
  })

  assert.ok(version.notes.some((note) => /language_id=7/.test(note)))
  assert.ok(version.notes.some((note) => /effect-reference\.json/.test(note)))
})

test('normalizeEffectReference 在归一化层提取 CNE effect 对象串的 effect_string', () => {
  // CNE 数据源格式特性（见 AGENTS.md 1.3）：upgrade_defines.effect 有时是 JSON 对象串，
  // 序列化不稳定（合法 JSON 与 effect_string 行末缺逗号的伪 JSON 混存）。
  // 归一化层统一提取内部 effect_string，让下游消费方永远拿到干净的标准 effect 串。
  // 合法 JSON 形态
  assert.equal(
    normalizeEffectReference('{"effect_string":"buff_upgrade,100,4","description":"x"}'),
    'buff_upgrade,100,4',
  )
  // 伪 JSON（effect_string 行末缺逗号）
  assert.equal(
    normalizeEffectReference('{\n"effect_string":"buff_upgrades,100,4,5"\n"description":"missing comma"}'),
    'buff_upgrades,100,4,5',
  )
  // 简单 effect 串原样返回
  assert.equal(normalizeEffectReference('hero_dps_multiplier_mult,100'), 'hero_dps_multiplier_mult,100')
  assert.equal(normalizeEffectReference('effect_def,1308'), 'effect_def,1308')
  // 空/非串
  assert.equal(normalizeEffectReference(null), null)
  assert.equal(normalizeEffectReference('   '), null)
})

test('normalizeDefinitionsSnapshot 在 manualOverrides 文件损坏时抛错而非静默丢失', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'idle-champions-normalize-'))
  const malformedOverrides = path.join(tempDir, 'bad-overrides.json')
  await writeFile(malformedOverrides, '{ not valid json', 'utf8')

  await assert.rejects(
    normalizeDefinitionsSnapshot({
      input: path.resolve('scripts/fixtures/mock-definitions.json'),
      localizedInput: path.resolve('scripts/fixtures/mock-definitions-zh.json'),
      outputDir: path.join(tempDir, 'out'),
      versionFile: path.join(tempDir, 'version.json'),
      manualOverrides: malformedOverrides,
    }),
  )
})

test('normalizeDefinitionsSnapshot 在 manualOverrides 缺失时回退空默认', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'idle-champions-normalize-'))

  // 文件不存在应回退空默认，不抛错
  await normalizeDefinitionsSnapshot({
    input: path.resolve('scripts/fixtures/mock-definitions.json'),
    localizedInput: path.resolve('scripts/fixtures/mock-definitions-zh.json'),
    outputDir: path.join(tempDir, 'out'),
    versionFile: path.join(tempDir, 'version.json'),
    manualOverrides: path.join(tempDir, 'does-not-exist.json'),
  })
})
