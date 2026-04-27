import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { mkdtemp, readFile } from 'node:fs/promises'
import { normalizeDefinitionsSnapshot } from './normalize-idle-champions-definitions.mjs'

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

  assert.deepEqual(variants.items[0].name, {
    original: 'A Test Variant',
    display: '测试变体',
  })
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

  assert.match(version.notes[1], /language_id=7/)
})
