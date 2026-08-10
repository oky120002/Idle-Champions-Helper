import { Decimal } from 'decimal.js'
import { describe, expect, it } from 'vitest'

import { unwrap } from '../../../tests/utils/dom-assertions'
import type { HeroAbilityKind, ResolvedHeroAbilityProfile } from '../abilities/abilityModel'
import { buildPlannerExplanations } from './plannerNarrative'
import type { PlannerPlacementEntry } from './recommendationTypes'
import type { ResolvedPlannerScenarioModel } from './plannerModel'

function makeHero(heroId: string, display: string, seat: number): ResolvedHeroAbilityProfile {
  // buildPlannerExplanations 只读 heroId / name.display / seat，其余字段测试无关。
  return { heroId, seat, name: { display } } as unknown as ResolvedHeroAbilityProfile
}

function makePlacement(heroId: string): PlannerPlacementEntry {
  return { heroId, slotId: `slot-${heroId}`, slotLabel: `slot-${heroId}`, heroName: heroId, seat: 1 }
}

const scenario = { scenarioWarnings: [] } as unknown as ResolvedPlannerScenarioModel

describe('buildPlannerExplanations', () => {
  it('team-gold 模式短路：即使有 carry + 信号也只返回 2 行，且不含 carry 名', () => {
    const heroById = new Map([['h1', makeHero('h1', 'Minsc', 1)]])
    const lines = buildPlannerExplanations(
      scenario,
      [makePlacement('h1')],
      heroById,
      'h1',
      new Decimal('1.50e92'),
      new Set<HeroAbilityKind>(['globalDpsMultiplier', 'heroDpsMultiplier']),
      'team-gold',
    )

    expect(lines).toHaveLength(2)
    expect(unwrap(lines[1], 'expected line at index 1').zh).toContain('team_gold_find')
    expect(lines.some((line) => line.zh.includes('Minsc'))).toBe(false)
  })

  it('carry-dps + carry + hero 信号：3 行，carry 行含英雄名、objectiveValue 与支援名', () => {
    const heroById = new Map([
      ['carry', makeHero('carry', 'Minsc', 7)],
      ['support', makeHero('support', 'Birdsong', 3)],
    ])
    const lines = buildPlannerExplanations(
      scenario,
      [makePlacement('carry'), makePlacement('support')],
      heroById,
      'carry',
      new Decimal('1.50e92'),
      new Set<HeroAbilityKind>(['heroDpsMultiplier']),
      'carry-dps',
    )

    expect(lines).toHaveLength(3)
    const carryLine = lines.find((line) => line.zh.includes('核心输出位'))
    expect(carryLine).toBeDefined()
    const carry = unwrap(carryLine, 'expected carry line')
    expect(carry.zh).toContain('Minsc')
    expect(carry.zh).toContain('1.50e92') // formatGameNumber(objectiveValue)
    expect(carry.zh).toContain('Birdsong') // 支援总结
  })

  it('carry-dps + 无 carry + 无信号：2 行（槽位 + 通用），无 carry 行', () => {
    const lines = buildPlannerExplanations(
      scenario,
      [makePlacement('h1')],
      new Map(),
      null,
      new Decimal('0'),
      new Set<HeroAbilityKind>(),
      'carry-dps',
    )

    expect(lines).toHaveLength(2)
    expect(lines.some((line) => line.zh.includes('核心输出位'))).toBe(false)
  })

  it('team-speed 模式短路：返回 2 行含速度因子，不含 carry 名', () => {
    const heroById = new Map([['h1', makeHero('h1', 'Deekin', 1)]])
    const lines = buildPlannerExplanations(
      scenario,
      [makePlacement('h1')],
      heroById,
      null,
      new Decimal('3.75'),
      new Set<HeroAbilityKind>(),
      'team-speed',
    )

    expect(lines).toHaveLength(2)
    expect(unwrap(lines[1], 'expected line at index 1').zh).toContain('3.75')
    expect(lines.some((line) => line.zh.includes('Deekin'))).toBe(false)
  })
})
