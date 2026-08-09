import { describe, expect, it } from 'vitest'

import type { HeroAbilityProfile } from '../abilities/abilityModel'
import type { LocalizedOption, LocalizedText, Variant } from '../types'
import {
  findPlannerScenarioForVariant,
  resolvePlannerModel,
  type OfficialPlannerScenarioModel, EMPTY_VIABILITY_CONTEXT,
} from './plannerModel'

function text(original: string, display = original): LocalizedText {
  return { original, display }
}

function option(id: string, original: string, display = original): LocalizedOption {
  return { id, original, display }
}

function createVariant(id: string): Variant {
  return {
    id,
    campaign: option('campaign-a', 'Grand Tour', '剑湾之旅'),
    name: text('Archer Barrage', '弓兵压制'),
    adventureId: 'adventure-1',
    adventure: text('Catacombs', '墓穴深处'),
    objectiveArea: 125,
    locationId: null,
    areaSetId: null,
    scene: null,
    restrictions: [],
    rewards: [],
    enemyCount: 0,
    enemyTypes: [],
    forcedHeroIds: [],
    allowedHeroIds: [],
    allowedTagExpression: [],
    attackMix: { melee: 0, ranged: 0, magic: 0, other: 0 },
    specialEnemyCount: 0,
    escortCount: 0,
    areaHighlights: [],
    areaMilestones: [],
    mechanics: [],
  }
}

function createHero(heroId: string): HeroAbilityProfile {
  return {
    heroId,
    name: text(heroId, heroId),
    seat: 1,
    roles: ['support'],
    tags: [],
    baseAttackDamageTypes: [],
    baseAttackCooldown: null,
    age: null,
    abilityScores: {},
    baseDamage: 1,
    baseHealth: 1,
    carrySignals: [],
    supportSignals: [
      {
        kind: 'globalDpsMultiplier',
        value: 100,
        rawEffect: 'global_dps_multiplier_mult,100',
        source: 'official-parsed',
      },
    ],
    unsupportedSignals: [],
    sourceBreakdown: {
      carrySignals: [],
      supportSignals: ['official-parsed'],
      unsupportedSignals: [],
    },
  }
}

describe('planner model merge', () => {
  it('按 官方 < 仓库补丁 < 浏览器 override 合并 hero planner model', () => {
    const resolved = resolvePlannerModel(
      [createHero('bruenor')],
      [],
      [
        {
          heroId: 'bruenor',
          carrySignals: [
            { kind: 'heroDpsMultiplier', value: 50, rawEffect: 'hero_dps_mult,50' },
          ],
          supportSignals: [
            { kind: 'globalDpsMultiplier', value: 120, rawEffect: 'global_dps_multiplier_mult,120' },
          ],
        },
      ],
      [
        {
          heroId: 'bruenor',
          supportSignals: [
            { kind: 'globalDpsMultiplier', value: 240, rawEffect: 'global_dps_multiplier_mult,240' },
          ],
          unsupportedSignals: [
            { rawEffect: 'mystery_effect', rawValue: '1', note: 'manual note' },
          ],
        },
      ],
    )

    expect(resolved.scenarios).toEqual([])
    expect(resolved.heroes).toHaveLength(1)
    expect(resolved.heroes[0]?.carrySignals).toEqual([
      {
        kind: 'heroDpsMultiplier',
        value: 50,
        rawEffect: 'hero_dps_mult,50',
        source: 'repo-semantic-patch',
      },
    ])
    expect(resolved.heroes[0]?.sourceBreakdown.carrySignals).toEqual(['repo-semantic-patch'])
    expect(resolved.heroes[0]?.supportSignals).toEqual([
      {
        kind: 'globalDpsMultiplier',
        value: 240,
        rawEffect: 'global_dps_multiplier_mult,240',
        source: 'browser-local-override',
      },
    ])
    expect(resolved.heroes[0]?.unsupportedSignals).toEqual([
      {
        rawEffect: 'mystery_effect',
        rawValue: '1',
        note: 'manual note',
        source: 'browser-local-override',
      },
    ])
    expect(resolved.heroes[0]?.sourceBreakdown.supportSignals).toEqual(['browser-local-override'])
    expect(resolved.heroes[0]?.sourceBreakdown.unsupportedSignals).toEqual(['browser-local-override'])
  })
})

describe('findPlannerScenarioForVariant', () => {
  it('按 variant id 命中对应 scenario', () => {
    const variant = createVariant('variant-1')
    const scenarios: OfficialPlannerScenarioModel[] = [
      {
        variantId: variant.id,
        scenarioRef: { kind: 'variant', id: variant.id },
        name: variant.name,
        formationLayoutId: 'layout-a',
        objectiveArea: 125,
        slotTopology: [],
        forcedHeroes: [],
        enemyTypes: [],
        allowedHeroes: [],
        allowedTagExpression: [],
        attributeRequirements: [],
        occupiedSlotCount: 0,
    viabilityContext: EMPTY_VIABILITY_CONTEXT,
    damageSourcePattern: null,
        scenarioWarnings: [],
      },
    ]

    expect(findPlannerScenarioForVariant(scenarios, variant)).toEqual(scenarios[0])
    expect(findPlannerScenarioForVariant(scenarios, createVariant('variant-2'))).toBeNull()
  })
})
