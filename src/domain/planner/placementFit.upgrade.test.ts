import { describe, expect, it } from 'vitest'

import type { HeroAbilitySignal } from '../abilities/abilityModel'
import { evaluatePlacementFit } from './placementFit'
import { createHero, extendedScenario, scenario } from './placementFitTestFixtures'

describe('placement fit — upgrade', () => {
  it('buff_upgrade 会按基础 buff 幅度折算增量收益', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          {
            kind: 'heroDpsMultiplier',
            value: 50,
            rawEffect: 'buff_upgrade,50,base-upgrade',
            source: 'official-parsed',
            positionQualifier: { relation: 'adjacent' },
            bonusScaleOfSignal: {
              kind: 'heroDpsMultiplier',
              value: 80,
              rawEffect: 'hero_dps_multiplier_mult,80',
              source: 'official-parsed',
              positionQualifier: { relation: 'adjacent' },
            },
          },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    expect(fit.totalMultiplier).toBeCloseTo(1.4, 6)
    expect(fit.scoreBreakdown[0]?.multiplier).toBeCloseTo(1.4, 6)
  })

  it('buff_upgrade_per_any_tagged_crusader_mult 会先算堆叠，再折算基础 buff 幅度', () => {
    const supportHero = createHero('support', {
      supportSignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 200,
          rawEffect: 'buff_upgrade_per_any_tagged_crusader_mult,200,base-upgrade,evil',
          source: 'official-parsed',
          amountFunc: 'mult',
          stackFunc: 'per_tagged_crusader_mult',
          positionQualifier: { relation: 'any' },
          formationCountQualifier: {
            predicate: { op: 'tag', tag: 'evil' },
          },
          targetQualifier: {
            predicate: { op: 'stat', stat: 'int', operator: '<=', value: 12 },
          },
          bonusScaleOfSignal: {
            kind: 'heroDpsMultiplier',
            value: 100,
            rawEffect: 'hero_dps_multiplier_mult,100',
            source: 'official-parsed',
            positionQualifier: { relation: 'any' },
            targetQualifier: {
              predicate: { op: 'stat', stat: 'int', operator: '<=', value: 12 },
            },
          },
        },
      ],
    })
    const carryHero = createHero('carry', {
      abilityScores: { int: 10 },
    })
    const allyA = createHero('ally-a', { tags: ['evil'] })
    const allyB = createHero('ally-b', { tags: ['evil'] })

    const fit = evaluatePlacementFit({
      carrySlotId: 's2',
      supportSlotId: 's1',
      scenario: extendedScenario,
      placements: {
        s1: 'support',
        s2: 'carry',
        s3: 'ally-a',
        s4: 'ally-b',
      },
      heroesById: new Map([
        ['support', supportHero],
        ['carry', carryHero],
        ['ally-a', allyA],
        ['ally-b', allyB],
      ]),
      carryHero,
      supportHero,
    })

    expect(fit.totalMultiplier).toBeCloseTo(9, 6)
    expect(fit.scoreBreakdown[0]?.multiplier).toBeCloseTo(9, 6)
  })

  it('buff_upgrade_mult_by_distance_from_source_mult 会按槽位距离先堆叠，再折算基础 buff 幅度', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's4',
      supportHero: createHero('support', {
        supportSignals: [
          {
            kind: 'heroDpsMultiplier',
            value: 400,
            rawEffect: 'buff_upgrade_mult_by_distance_from_source_mult,400,base-upgrade',
            source: 'official-parsed',
            amountFunc: 'mult',
            stackFunc: 'per_slot_distance_from_source',
            positionQualifier: { relation: 'nonAdjacent' },
            bonusScaleOfSignal: {
              kind: 'heroDpsMultiplier',
              value: 100,
              rawEffect: 'hero_dps_multiplier_mult,100',
              source: 'official-parsed',
              positionQualifier: { relation: 'nonAdjacent' },
            },
          },
        ],
      }),
      supportSlotId: 's1',
      scenario: extendedScenario,
    })

    expect(fit.totalMultiplier).toBeCloseTo(125, 6)
    expect(fit.scoreBreakdown[0]?.multiplier).toBeCloseTo(125, 6)
  })

  it('buff_upgrade 修饰叠层基数时按 base.value 折算（非聚合倍率，蔚善良榜样形态）', () => {
    // 回归：bonusScaleOfSignal 指向叠层基数（per_hero mult, value=300）时，
    // applySignalPercent 须按 base.value（per-stack 300）折算，而非 invertEffectMultiplier(聚合 4^N)。
    // 真实数据：蔚 ed=12312 善良榜样 per_hero mult,300 + 多条 buff_upgrade,100/200,12312 修饰。
    // 旧 bug：basePercent=(4^3-1)*100=6300 → modifier mult=64 → addPercent=6300 → total=(1+63)*64=4096（灾难高估）。
    // 修复后：basePercent=base.value=300 → modifier mult=4 → addPercent=300 → total=(1+3)*64=256。
    const goodExampleBase: HeroAbilitySignal = {
      kind: 'heroDpsMultiplier',
      value: 300,
      rawEffect: 'hero_dps_multiplier_mult,300',
      source: 'official-parsed',
      amountFunc: 'mult',
      stackFunc: 'per_hero',
      formationCountQualifier: { predicate: { op: 'tag', tag: 'good' } },
    }
    const vi = createHero('vi', {
      tags: ['good', 'geneutral'],
      carrySignals: [
        goodExampleBase,
        {
          kind: 'heroDpsMultiplier',
          value: 100,
          rawEffect: 'buff_upgrade,100,12312',
          source: 'official-parsed',
          bonusScaleOfSignal: goodExampleBase,
        },
      ],
    })
    const heroesById = new Map([
      ['vi', vi],
      ['g1', createHero('g1', { tags: ['good'] })],
      ['g2', createHero('g2', { tags: ['good'] })],
    ])

    const fit = evaluatePlacementFit({
      carryHero: vi,
      carrySlotId: 's2',
      supportHero: vi,
      supportSlotId: 's2',
      placements: { s1: 'g1', s2: 'vi', s3: 'g2' },
      scenario,
      heroesById,
    })

    // 基数 4^3=64（3 名 good，multFactor）；修饰 addPercent=300 → (1+3)*64 = 256
    expect(fit.totalMultiplier).toBeCloseTo(256, 6)
  })
})
