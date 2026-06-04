import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'

import { buildPlannerModels } from './build-planner-models.mjs'

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

test('buildPlannerModels 产出 planner heroes / scenarios / semantic overrides', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'idle-champions-planner-models-'))
  const versionDir = path.join(tempDir, 'data')
  const detailDir = path.join(versionDir, 'champion-details')
  const semanticOverridesFile = path.join(tempDir, 'planner-semantic-overrides.json')

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
            { id: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
            { id: 's2', row: 1, column: 2, adjacentSlotIds: ['s1'] },
          ],
        },
      ],
    }),
  )
  await writeFile(
    path.join(detailDir, '1.json'),
    JSON.stringify({
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
                  { effect_string: 'hero_dps_mult_per_target_crusader,100,adj', amount_func: 'mult', stack_func: 'per_crusader' },
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
          isCarryViable: true,
          supportSignals: [
            { kind: 'adjacentBuff', value: 150, rawEffect: 'adjacent_buff,150' },
          ],
        },
      },
    }),
  )

  const result = await buildPlannerModels({ versionDir, semanticOverridesFile })
  const plannerHeroes = await readJson(path.join(versionDir, 'planner-heroes.json'))
  const plannerScenarios = await readJson(path.join(versionDir, 'planner-scenarios.json'))
  const plannerOverrides = await readJson(path.join(versionDir, 'planner-semantic-overrides.json'))

  assert.equal(result.heroCount, 1)
  assert.equal(result.scenarioCount, 1)
  assert.equal(plannerHeroes.updatedAt, '2026-06-04')
  assert.equal(plannerHeroes.items[0].heroId, '1')
  assert.equal(plannerHeroes.items[0].age, 40)
  assert.equal(plannerHeroes.items[0].abilityScores.str, 15)
  assert.equal(plannerHeroes.items[0].carrySignals[0].kind, 'heroDpsMultiplier')
  assert.equal(plannerHeroes.items[0].supportSignals[0].kind, 'globalDpsMultiplier')
  assert.equal(plannerHeroes.items[0].supportSignals[1].rawEffect, 'tag_dps,40')
  assert.equal(plannerHeroes.items[0].supportSignals[1].amountFunc, 'add')
  assert.deepEqual(plannerHeroes.items[0].supportSignals[1].targetQualifier, {
    requiredTags: ['female'],
    matchMode: 'any',
  })
  assert.deepEqual(plannerHeroes.items[0].supportSignals[2].formationCountQualifier, {
    requiredStats: [{ stat: 'str', operator: '>=', value: 15 }],
  })
  assert.equal(plannerHeroes.items[0].unsupportedSignals[0].rawEffect, 'hero_dps_mult_per_target_crusader')
  assert.equal(plannerScenarios.items[0].formationLayoutId, 'layout-a')
  assert.equal(plannerScenarios.items[0].scenarioWarnings.length, 1)
  assert.deepEqual(plannerOverrides.items, [
    {
      heroId: '1',
      isCarryViable: true,
      supportSignals: [
        { kind: 'adjacentBuff', value: 150, rawEffect: 'adjacent_buff,150' },
      ],
    },
  ])
})
