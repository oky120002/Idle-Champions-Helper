import { describe, expect, it } from 'vitest'
import { scoreFormation } from '../../../../src/domain/planner/steadyStateScoring'
import type { OfficialPlannerHeroModel, OfficialPlannerScenarioModel } from '../../../../src/domain/planner/plannerModel'

function createHero(heroId: string, overrides: Partial<OfficialPlannerHeroModel> = {}): OfficialPlannerHeroModel {
  return {
    heroId,
    name: { original: heroId, display: heroId },
    seat: overrides.seat ?? 1,
    roles: overrides.roles ?? [],
    tags: overrides.tags ?? [],
    age: overrides.age ?? null,
    abilityScores: overrides.abilityScores ?? {},
    isCarryViable: overrides.isCarryViable ?? false,
    heuristicRoleMultiplier: overrides.heuristicRoleMultiplier ?? 1,
    carrySignals: overrides.carrySignals ?? [],
    supportSignals: overrides.supportSignals ?? [],
    unsupportedSignals: overrides.unsupportedSignals ?? [],
    sourceBreakdown: overrides.sourceBreakdown ?? {
      isCarryViable: 'official-parsed',
      heuristicRoleMultiplier: 'heuristic-fallback',
      carrySignals: [],
      supportSignals: [],
      unsupportedSignals: [],
    },
  }
}

const scenario: OfficialPlannerScenarioModel = {
  variantId: 'variant-1',
  scenarioRef: { kind: 'variant', id: 'variant-1' },
  name: { original: 'Test', display: 'Test' },
  formationLayoutId: 'layout-a',
  objectiveArea: 1,
  slotTopology: [
    { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
    { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
    { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2'] },
  ],
  forcedHeroes: [],
  bannedHeroes: [],
  lockedSlots: [],
  scenarioWarnings: [],
}

describe('steady state scoring', () => {
  it('相邻增益支持位靠近 carry 时评分更高', () => {
    const carry = createHero('carry', {
      seat: 1,
      roles: ['dps'],
      isCarryViable: true,
      heuristicRoleMultiplier: 2,
      carrySignals: [
        { kind: 'heroDpsMultiplier', value: 100, rawEffect: 'hero_dps_multiplier_mult,100', source: 'official-parsed' },
      ],
    })
    const support = createHero('bruenor', {
      seat: 2,
      supportSignals: [
        { kind: 'adjacentBuff', value: 100, rawEffect: 'adjacent_buff,100', source: 'official-parsed' },
      ],
    })
    const heroesById = new Map([
      ['carry', carry],
      ['bruenor', support],
    ])

    const adjacentSupportScore = scoreFormation({
      placements: { s1: 'bruenor', s2: 'carry' },
      heroesById,
      scenario,
    })

    const nonAdjacentScore = scoreFormation({
      placements: { s1: 'bruenor', s3: 'carry' },
      heroesById,
      scenario,
    })

    expect(adjacentSupportScore.score).toBeGreaterThan(nonAdjacentScore.score)
  })

  it('global support 不受 adjacency 影响', () => {
    const carry = createHero('carry', {
      seat: 1,
      roles: ['dps'],
      isCarryViable: true,
      heuristicRoleMultiplier: 2,
    })
    const support = createHero('global-buffer', {
      seat: 2,
      supportSignals: [
        { kind: 'globalDpsMultiplier', value: 200, rawEffect: 'global_dps_multiplier_mult,200', source: 'official-parsed' },
      ],
    })
    const heroesById = new Map([
      ['carry', carry],
      ['global-buffer', support],
    ])

    const nearScore = scoreFormation({
      placements: { s1: 'global-buffer', s2: 'carry' },
      heroesById,
      scenario,
    })

    const farScore = scoreFormation({
      placements: { s1: 'global-buffer', s3: 'carry' },
      heroesById,
      scenario,
    })

    expect(nearScore.score).toBe(farScore.score)
    expect(nearScore.carryHeroId).toBe('carry')
  })

  it('缺少 tagged target qualifier 时只进入 warning，不计分', () => {
    const carry = createHero('carry', {
      seat: 1,
      roles: ['dps'],
      tags: ['female'],
      isCarryViable: true,
      heuristicRoleMultiplier: 2,
    })
    const support = createHero('tag-buffer', {
      seat: 2,
      supportSignals: [
        { kind: 'taggedChampionBuff', value: 100, rawEffect: 'tag_dps,100', source: 'official-parsed' },
      ],
    })
    const heroesById = new Map([
      ['carry', carry],
      ['tag-buffer', support],
    ])

    const result = scoreFormation({
      placements: { s1: 'carry', s2: 'tag-buffer' },
      heroesById,
      scenario,
    })

    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('缺少 carry 目标标签')
    expect(result.score).toBe(2)
  })
})
