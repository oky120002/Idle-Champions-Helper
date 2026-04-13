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

  assert.deepEqual(variants.items[0].name, {
    original: 'A Test Variant',
    display: '测试变体',
  })
  assert.deepEqual(variants.items[0].campaign, {
    id: '1',
    original: 'A Grand Tour of the Sword Coast',
    display: '剑湾之旅',
  })
  assert.deepEqual(variants.items[0].restrictions, [
    {
      original: 'Only champions with 14+ CON',
      display: '只能使用体质 14+ 的勇士',
    },
  ])

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
