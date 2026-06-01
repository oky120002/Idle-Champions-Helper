import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { I18nProvider } from '../../src/app/i18n'
import { PlannerResultCard } from '../../src/pages/planner/PlannerResultCard'

describe('PlannerResultCard', () => {
  const baseProps = {
    score: '4.08e167',
    placements: { '1': 'bruenor', '3': 'nayeli', '7': 'jim' } as Record<string, string>,
    explanations: [
      { zh: '布鲁诺负责团队增益。', en: 'Bruenor anchors the team buffs.' },
      { zh: '纳耶里补足前排。', en: 'Nayeli rounds out the frontline.' },
    ],
    warnings: [],
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

    expect(screen.getByText('槽位 1')).toBeInTheDocument()
    expect(screen.getAllByText('bruenor').length).toBeGreaterThan(0)
    expect(screen.getByText('槽位 3')).toBeInTheDocument()
    expect(screen.getAllByText('nayeli').length).toBeGreaterThan(0)
    expect(screen.getByText('槽位 7')).toBeInTheDocument()
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

  it('在不支持时显示警告部分', () => {
    const props = {
      ...baseProps,
      warnings: ['Hitch 不在当前阵容池中'],
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
})
