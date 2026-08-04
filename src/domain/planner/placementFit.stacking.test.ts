import { describe, expect, it } from 'vitest'

import type { HeroAbilitySignal } from '../abilities/abilityModel'
import { evaluatePlacementFit } from './placementFit'
import { createHero, scenario } from './placementFitTestFixtures'

describe('placement fit — stacking', () => {
  it('dynamic-stack-multiply 按 manualStackCount 乘算堆叠（蔚出言不逊形态）', () => {
    // 对应蔚"出言不逊永不够"：stacksMultiply=true + amountFunc=null + 动态层数。
    // 层数来自数值表达式（unsupported），由 manualStackCount 提供假设值。
    const supportHero = createHero('support', {
      carrySignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 100,
          rawEffect: 'buff_upgrade,100,12312',
          source: 'official-parsed',
          stacksMultiply: true,
        },
      ],
    })

    const fit = evaluatePlacementFit({
      carryHero: supportHero,
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's2',
      scenario,
      manualStackCount: 10,
    })

    // percentToMultiplier(100)=2 → 2^10 = 1024（乘算堆叠，非线性累加）
    expect(fit.totalMultiplier).toBe(1024)
    expect(fit.scoreBreakdown[0]?.active).toBe(true)
  })

  it('stacksMultiply 高 value + 大 manualStackCount 溢出时降级 warning 不计分（不崩溃）', () => {
    // 默认 manualStackCount=1000 + value=200 → 3^1000 = Infinity → 溢出 warning，信号不计分。
    // 真实数据 52 个 stacksMultiply signal value>103%（默认 1000 下溢出），须优雅降级非崩溃/非 NaN。
    const supportHero = createHero('support', {
      carrySignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 200,
          rawEffect: 'buff_upgrade,200,1',
          source: 'official-parsed',
          stacksMultiply: true,
        },
      ],
    })
    const fit = evaluatePlacementFit({
      carryHero: supportHero,
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's2',
      scenario,
      manualStackCount: 1000,
    })
    expect(fit.totalMultiplier).toBe(1)
    expect(fit.warnings.some((w) => w.includes('溢出'))).toBe(true)
  })

  it('stacksMultiply 信号依赖的基础 0 层（multiplier≤1）时不计分（与 applySignalPercent 对称守护）', () => {
    // RV-A02-2：stacksMultiply 分支 bonusScaleOfSignal 依赖加 multiplier>1 守护——基础 0 层（如善良榜样
    // 无 good 英雄 → 4^0=1）时出言不逊类 stacksMultiply 信号不应生效（基础无效应不放大）。
    const dwarfBase: HeroAbilitySignal = {
      kind: 'heroDpsMultiplier',
      value: 100,
      rawEffect: 'hero_dps_mult_per_hero,100',
      source: 'official-parsed',
      amountFunc: 'mult',
      stackFunc: 'per_hero',
      formationCountQualifier: { predicate: { op: 'tag', tag: 'dwarf' } },
    }
    const supportHero = createHero('support', {
      carrySignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 10,
          rawEffect: 'buff_upgrade,10,1',
          source: 'official-parsed',
          stacksMultiply: true,
          bonusScaleOfSignal: dwarfBase,
        },
      ],
    })
    // 阵型无 dwarf → 基础 count=0 → multiplier=4^0=1 → stacksMultiply 信号不生效
    const fit = evaluatePlacementFit({
      carryHero: supportHero,
      carrySlotId: 's2',
      supportHero,
      supportSlotId: 's2',
      scenario,
      placements: { s2: 'support' },
      heroesById: new Map([['support', supportHero]]),
      manualStackCount: 5,
    })
    expect(fit.totalMultiplier).toBe(1)
    expect(fit.scoreBreakdown.find((r) => r.rawEffect === 'buff_upgrade,10,1')?.active).toBe(false)
  })

  it('manualStackCount 缺省时用 DEFAULT_MANUAL_STACK_COUNT(1000)', () => {
    const supportHero = createHero('support', {
      carrySignals: [
        {
          kind: 'heroDpsMultiplier',
          value: 0.1,
          rawEffect: 'buff_upgrade,0.1,12312',
          source: 'official-parsed',
          stacksMultiply: true,
        },
      ],
    })
    const baseInput = {
      carryHero: supportHero,
      carrySlotId: 's2' as const,
      supportHero,
      supportSlotId: 's2' as const,
      scenario,
    }

    // 缺省 manualStackCount 与显式 1000 结果一致 → 证明默认值生效
    const fitDefault = evaluatePlacementFit(baseInput)
    const fitExplicit = evaluatePlacementFit({ ...baseInput, manualStackCount: 1000 })

    expect(fitDefault.totalMultiplier).toBeCloseTo(1.001 ** 1000, 6)
    expect(fitDefault.totalMultiplier).toBe(fitExplicit.totalMultiplier)
  })
})
