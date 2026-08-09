import type { HeroAbilityProfile } from '../abilities/abilityModel'
import { type OfficialPlannerScenarioModel, EMPTY_VIABILITY_CONTEXT } from './plannerModel'

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
    sourceBreakdown: overrides.sourceBreakdown ?? {
      carrySignals: [],
      supportSignals: [],
      unsupportedSignals: [],
    },
  }
}

export const scenario: OfficialPlannerScenarioModel = {
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
  allowedTagExpression: [],
  attributeRequirements: [],
  occupiedSlotCount: 0,
    viabilityContext: EMPTY_VIABILITY_CONTEXT,
  scenarioWarnings: [],
}

export const extendedScenario: OfficialPlannerScenarioModel = {
  ...scenario,
  slotTopology: [
    { slotId: 's1', row: 1, column: 1, x: 80, y: 10, adjacentSlotIds: ['s2'] },
    { slotId: 's2', row: 1, column: 2, x: 60, y: 10, adjacentSlotIds: ['s1', 's3'] },
    { slotId: 's3', row: 1, column: 3, x: 40, y: 10, adjacentSlotIds: ['s2', 's4'] },
    { slotId: 's4', row: 1, column: 4, x: 20, y: 10, adjacentSlotIds: ['s3'] },
  ],
}

export const graphScenario: OfficialPlannerScenarioModel = {
  ...scenario,
  slotTopology: [
    { slotId: 's1', row: 1, column: 1, x: 80, y: 10, adjacentSlotIds: ['s2'] },
    { slotId: 's2', row: 1, column: 2, x: 60, y: 10, adjacentSlotIds: ['s1', 's3', 's5'] },
    { slotId: 's3', row: 1, column: 3, x: 40, y: 10, adjacentSlotIds: ['s2', 's4'] },
    { slotId: 's4', row: 1, column: 4, x: 20, y: 10, adjacentSlotIds: ['s3'] },
    { slotId: 's5', row: 2, column: 2, x: 60, y: 30, adjacentSlotIds: ['s2', 's6'] },
    { slotId: 's6', row: 2, column: 3, x: 40, y: 30, adjacentSlotIds: ['s5'] },
  ],
}
