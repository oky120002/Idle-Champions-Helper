import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import type { Champion, FormationSlot } from '../../domain/types'
import { estimateMaxArea } from '../../domain/simulator/areaEstimation'
import { monsterHealthAt } from '../../domain/simulator/monsterStats'
import { PlannerResultCard } from './PlannerResultCard'

describe('PlannerResultCard', () => {
  const slots: FormationSlot[] = [
    { id: '1', row: 1, column: 1 },
    { id: '3', row: 1, column: 2 },
    { id: '7', row: 2, column: 1 },
  ]
  const championById = new Map<string, Champion>([
    [
      'bruenor',
      {
        id: 'bruenor',
        name: { original: 'Bruenor', display: '布鲁诺' },
        seat: 1,
        roles: [],
        affiliations: [],
        tags: [],
      },
    ],
  ])

  const baseProps = {
    objectiveValue: '4.08e167',
    carryHeroId: null as string | null,
    placements: { '1': 'bruenor', '3': 'nayeli', '7': 'jim' } as Record<string, string>,
    explanations: [
      { literal: '布鲁诺负责团队增益。' },
      { literal: '纳耶里补足前排。' },
    ],
    warnings: [],
    breakdown: null,
    slots,
    championById,
  }

  it('显示游戏记分法表示的得分', () => {
    render(
      <I18nProvider>
        <PlannerResultCard {...baseProps} />
      </I18nProvider>,
    )

    expect(screen.getByText('4.08e167')).toBeInTheDocument()
  })

  it('以文本形式显示槽位分配', () => {
    render(
      <I18nProvider>
        <PlannerResultCard {...baseProps} />
      </I18nProvider>,
    )

    expect(screen.getAllByText('槽位 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('bruenor').length).toBeGreaterThan(0)
    expect(screen.getAllByText('槽位 3').length).toBeGreaterThan(0)
    expect(screen.getAllByText('nayeli').length).toBeGreaterThan(0)
    expect(screen.getAllByText('槽位 7').length).toBeGreaterThan(0)
    expect(screen.getAllByText('jim').length).toBeGreaterThan(0)
  })

  it('显示说明部分', () => {
    render(
      <I18nProvider>
        <PlannerResultCard {...baseProps} />
      </I18nProvider>,
    )

    expect(screen.getByText('布鲁诺负责团队增益。')).toBeInTheDocument()
    expect(screen.getByText('纳耶里补足前排。')).toBeInTheDocument()
  })

  it('显示推图仪表盘的对照和瓶颈说明', () => {
    render(
      <I18nProvider>
        <PlannerResultCard
          {...baseProps}
          areaEstimate={estimateMaxArea({ bud: monsterHealthAt(100), effectiveHealth: null })}
        />
      </I18nProvider>,
    )

    expect(screen.getByTestId('planner-area-comparison')).toBeInTheDocument()
    expect(screen.getByTestId('planner-area-diagnosis')).toHaveTextContent('当前伤害与目标层生命接近')
  })

  it('在不支持时显示警告部分', () => {
    const props = {
      ...baseProps,
       warnings: [{ literal: 'Hitch 不在当前阵容池中' }],
    }

    render(
      <I18nProvider>
        <PlannerResultCard {...props} />
      </I18nProvider>,
    )

    expect(screen.getByText('Hitch 不在当前阵容池中')).toBeInTheDocument()
  })

  it('无警告时不渲染警告部分', () => {
    const { container } = render(
      <I18nProvider>
        <PlannerResultCard {...baseProps} />
      </I18nProvider>,
    )

    expect(container.querySelector('[data-section="warnings"]')).toBeNull()
  })

  it('渲染阵型棋盘并按 carryHeroId 高亮 carry 槽位', () => {
    const { container } = render(
      <I18nProvider>
        <PlannerResultCard {...baseProps} carryHeroId="bruenor" />
      </I18nProvider>,
    )

    expect(container.querySelector('[data-testid="planner-result-board"]')).not.toBeNull()
    expect(container.querySelector('[data-slot-id="1"].formation-slot--carry')).not.toBeNull()
  })
})
