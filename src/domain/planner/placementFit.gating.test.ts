import { describe, expect, it } from 'vitest'

import { evaluatePlacementFit } from './placementFit'
import { createHero, scenario } from './placementFitTestFixtures'

describe('placement fit — gating', () => {
  it('signal requiredLevel > supportLevel 时被过滤（等级解锁门控）', () => {
    const supportHero = createHero('support', {
      supportSignals: [
        { kind: 'globalDpsMultiplier', value: 100, rawEffect: 'locked_global,100', source: 'official-parsed', requiredLevel: 100 },
      ],
    })
    const fitLocked = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's1',
      scenario,
      supportLevel: 50,
    })
    const fitUnlocked = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's1',
      scenario,
      supportLevel: 150,
    })
    expect(fitLocked.totalMultiplier).toBe(1)
    expect(fitLocked.scoreBreakdown[0]?.reasonCode).toBe('level-locked')
    expect(fitUnlocked.totalMultiplier).toBe(2)
    expect(fitUnlocked.scoreBreakdown[0]?.reasonCode).toBe('global-match')
  })

  it('supportLevel 不传时不按等级过滤（向后兼容，未解锁 signal 仍计分）', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          { kind: 'globalDpsMultiplier', value: 100, rawEffect: 'g,100', source: 'official-parsed', requiredLevel: 999 },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })
    expect(fit.totalMultiplier).toBe(2)
    expect(fit.scoreBreakdown[0]?.reasonCode).toBe('global-match')
  })

  it('carry 自带 heroDpsMultiplier 只在自己作为 carry 时计入', () => {
    const carryHero = createHero('carry', {
      carrySignals: [
        { kind: 'heroDpsMultiplier', value: 150, rawEffect: 'hero_dps_multiplier_mult,150', source: 'official-parsed' },
      ],
    })

    const fit = evaluatePlacementFit({
      carryHero,
      carrySlotId: 's2',
      supportHero: carryHero,
      supportSlotId: 's2',
      scenario,
    })

    expect(fit.totalMultiplier).toBe(2.5)
    expect(fit.scoreBreakdown[0]?.reasonCode).toBe('carry-self-match')
  })

  it('taggedChampionBuff 标签命中时计分', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry', { tags: ['female', 'elf'] }),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          {
            kind: 'taggedChampionBuff',
            value: 50,
            rawEffect: 'tag_dps,50',
            source: 'repo-semantic-patch',
            targetQualifier: { predicate: { op: 'tag', tag: 'female' } },
          },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    expect(fit.totalMultiplier).toBe(1.5)
    expect(fit.scoreBreakdown[0]?.reasonCode).toBe('tag-match')
  })

  it('taggedChampionBuff 缺少目标语义时只出 warning', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry', { tags: ['female'] }),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          { kind: 'taggedChampionBuff', value: 50, rawEffect: 'tag_dps,50', source: 'official-parsed' },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    expect(fit.totalMultiplier).toBe(1)
    expect(fit.warnings[0]).toContain('缺少 carry 目标标签')
    expect(fit.scoreBreakdown[0]?.reasonCode).toBe('missing-target-qualifier')
  })

  it('manual stacking 先降级为 warning，不计分', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry'),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          {
            kind: 'globalDpsMultiplier',
            value: 100,
            rawEffect: 'global_dps_multiplier_mult,100',
            source: 'official-parsed',
            applyManually: true,
          },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    expect(fit.totalMultiplier).toBe(1)
    expect(fit.warnings[0]).toContain('手动触发')
  })

  it('stat qualifier 命中时可以作为 carry 目标条件计分', () => {
    const fit = evaluatePlacementFit({
      carryHero: createHero('carry', {
        abilityScores: { cha: 13 },
      }),
      carrySlotId: 's2',
      supportHero: createHero('support', {
        supportSignals: [
          {
            kind: 'taggedChampionBuff',
            value: 40,
            rawEffect: 'tag_dps,40',
            source: 'official-parsed',
            targetQualifier: {
              predicate: { op: 'stat', stat: 'cha', operator: '>=', value: 11 },
            },
          },
        ],
      }),
      supportSlotId: 's1',
      scenario,
    })

    expect(fit.totalMultiplier).toBe(1.4)
    expect(fit.scoreBreakdown[0]?.reasonCode).toBe('stat-match')
  })

  it('formationCountQualifier（count）与 targetQualifier（target）消费层不混用：carry 仅匹配 count 不匹配 target 时不计分', () => {
    // 蔚善良榜样形态：count=good（formationCountQualifier），target=geneutral（targetQualifier）。
    // 反例：carry 是 good 但非 geneutral → 会被数进 count（如作 support），但作 carry 不匹配 target → 不吃 buff。
    // 验证消费层 countQualifiedHeroes 用 formationCountQualifier、carry 匹配用 targetQualifier，二者不混用
    // （若混用，carry 匹配 count=good 就会误计分）。
    // self-carry 隔离 position：heroDpsMultiplier 无 positionQualifier 默认 relation='self'
    // （须 supportSlot===carrySlot），否则 position-mismatch 抢先致 inactive，测不到 target 门控。
    const vi = createHero('vi', {
      tags: ['good'],
      carrySignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 100,
          rawEffect: 'hero_dps_multiplier_mult,100',
          source: 'official-parsed',
          amountFunc: 'mult',
          stackFunc: 'per_hero',
          formationCountQualifier: { predicate: { op: 'tag', tag: 'good' } },
          targetQualifier: { predicate: { op: 'tag', tag: 'geneutral' } },
        },
      ],
    })

    const fit = evaluatePlacementFit({
      carryHero: vi,
      carrySlotId: 's2',
      supportHero: vi,
      supportSlotId: 's2',
      scenario,
      placements: { s2: 'vi' },
      heroesById: new Map([['vi', vi]]),
    })

    // vi 非 geneutral → targetQualifier 不匹配 → 不计分（即使匹配 formationCountQualifier=good）
    expect(fit.totalMultiplier).toBe(1)
    const entry = fit.scoreBreakdown.find((r) => r.rawEffect === 'hero_dps_multiplier_mult,100')
    expect(entry?.active).toBe(false)
  })
})
