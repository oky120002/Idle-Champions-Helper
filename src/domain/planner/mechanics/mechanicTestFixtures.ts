import type { HeroAbilityProfile, HeroAbilitySignal } from '../../abilities/abilityModel'
import type { OfficialPlannerScenarioModel } from '../plannerModel'
import type { EvaluatePlacementFitInput } from '../placementFitTypes'

export const testScenario: OfficialPlannerScenarioModel = {
  variantId: 'variant-1',
  scenarioRef: { kind: 'variant', id: 'variant-1' },
  name: { original: 'Test', display: 'Test' },
  formationLayoutId: 'layout-a',
  objectiveArea: 1,
  slotTopology: [
    { slotId: 's1', row: 1, column: 1, x: 60, y: 10, adjacentSlotIds: ['s2'] },
    { slotId: 's2', row: 1, column: 2, x: 40, y: 10, adjacentSlotIds: ['s1', 's3'] },
    { slotId: 's3', row: 1, column: 3, x: 20, y: 10, adjacentSlotIds: ['s2'] },
  ],
  forcedHeroes: [],
  enemyTypes: [],
  allowedHeroes: [],
  allowedTags: [],
  occupiedSlotCount: 0,
  scenarioWarnings: [],
}

export function createHero(heroId: string, overrides: Partial<HeroAbilityProfile> = {}): HeroAbilityProfile {
  return {
    heroId,
    name: { original: heroId, display: heroId },
    seat: overrides.seat ?? 1,
    roles: overrides.roles ?? [],
    tags: overrides.tags ?? [],
    baseAttackDamageTypes: overrides.baseAttackDamageTypes ?? [],
    baseAttackCooldown: overrides.baseAttackCooldown ?? null,
    age: overrides.age ?? null,
    abilityScores: overrides.abilityScores ?? {},
    baseDamage: overrides.baseDamage ?? 1,
    baseHealth: overrides.baseHealth ?? 1,
    carrySignals: overrides.carrySignals ?? [],
    supportSignals: overrides.supportSignals ?? [],
    unsupportedSignals: overrides.unsupportedSignals ?? [],
    sourceBreakdown: overrides.sourceBreakdown ?? { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
  }
}

/** 构造 resolveSignalMultiplier 单测用的 signal：默认 globalDpsMultiplier / 无 stackFunc / 无依赖。 */
export function buildSignal(overrides: Partial<HeroAbilitySignal> & { value: number }): HeroAbilitySignal {
  return {
    kind: 'globalDpsMultiplier',
    rawEffect: 'test',
    source: 'official-parsed',
    ...overrides,
  }
}

/** 构造 resolveSignalMultiplier 单测用的 input：默认 carry=s2 / support=s1 / testScenario。 */
export function buildInput(overrides: Partial<EvaluatePlacementFitInput> & {
  carryHero: HeroAbilityProfile
  supportHero: HeroAbilityProfile
}): EvaluatePlacementFitInput {
  return {
    carrySlotId: 's2',
    supportSlotId: 's1',
    scenario: testScenario,
    ...overrides,
  }
}
