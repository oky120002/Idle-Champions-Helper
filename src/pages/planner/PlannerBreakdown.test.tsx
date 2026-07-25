import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import type { SimulationBreakdown } from '../../domain/planner/steadyStateScoring'
import type { PlacementFitScorePart } from '../../domain/planner/placementFitTypes'
import { PlannerBreakdown } from './PlannerBreakdown'

function buildBreakdown(overrides: Partial<SimulationBreakdown> = {}): SimulationBreakdown {
  return {
    carryHeroId: 'carry',
    carrySlotId: 's1',
    carryLevel: 1,
    baseDps: '1.06e1',
    levelCurve: 1.06,
    carryDps: '6.36e1',
    factors: {
      damagePool: 6,
      crit: 1,
      vulnerability: 1,
      globalBuff: 1,
      equipmentAdjustment: 1,
    },
    pools: [],
    contributions: [
      {
        supportHeroId: 'carry',
        supportSlotId: 's1',
        signals: [
          { signalKind: 'heroDpsMultiplier', rawEffect: 'hero,100', multiplier: 2, active: true, reasonCode: 'carry-self-match', source: 'official-parsed' },
        ],
      },
      {
        supportHeroId: 'buf',
        supportSlotId: 's2',
        signals: [
          { signalKind: 'globalDpsMultiplier', rawEffect: 'g,200', multiplier: 3, active: true, reasonCode: 'global-match', source: 'official-parsed' },
        ],
      },
    ],
    ...overrides,
  }
}

describe('PlannerBreakdown', () => {
  it('breakdown 为 null 时不渲染', () => {
    const { container } = render(
      <I18nProvider>
        <PlannerBreakdown breakdown={null} heroNameById={new Map()} />
      </I18nProvider>,
    )
    expect(container.querySelector('[data-section="breakdown"]')).toBeNull()
  })

  it('渲染 baseDps → carryDps 公式与各因子', () => {
    render(
      <I18nProvider>
        <PlannerBreakdown breakdown={buildBreakdown()} heroNameById={new Map([['carry', '威尔'], ['buf', '斯凯拉']])} />
      </I18nProvider>,
    )
    const formula = screen.getByTestId('planner-breakdown-formula')
    expect(formula.textContent).toContain('1.06e1')
    expect(formula.textContent).toContain('6.36e1')
    // damagePool 因子 ×6.00 展示
    expect(screen.getByText('×6.00')).toBeInTheDocument()
  })

  it('按英雄列出加成来源，使用 heroNameById 解析名字', () => {
    render(
      <I18nProvider>
        <PlannerBreakdown breakdown={buildBreakdown()} heroNameById={new Map([['carry', '威尔'], ['buf', '斯凯拉']])} />
      </I18nProvider>,
    )
    expect(screen.getByText('威尔')).toBeInTheDocument()
    expect(screen.getByText('斯凯拉')).toBeInTheDocument()
    // 顶部加成按 multiplier 降序：globalDpsMultiplier ×3 排前
    expect(screen.getByText('×3.00')).toBeInTheDocument()
  })

  it('每位英雄超过 3 条加成时折叠为 +N', () => {
    const signals: PlacementFitScorePart[] = Array.from({ length: 5 }, (_, index) => ({
      signalKind: 'heroDpsMultiplier',
      rawEffect: `e,${index}`,
      multiplier: 2,
      active: true,
      reasonCode: 'carry-self-match',
      source: 'official-parsed',
    }))
    render(
      <I18nProvider>
        <PlannerBreakdown
          breakdown={buildBreakdown({
            contributions: [{ supportHeroId: 'carry', supportSlotId: 's1', signals }],
          })}
          heroNameById={new Map([['carry', '威尔']])}
        />
      </I18nProvider>,
    )
    expect(screen.getByText('+2 个')).toBeInTheDocument()
  })
})
