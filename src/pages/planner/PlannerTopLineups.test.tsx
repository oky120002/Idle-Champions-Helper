import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import type { Champion } from '../../domain/types'
import type { PlannerResult } from '../../domain/planner/recommendationTypes'
import { PlannerTopLineups } from './PlannerTopLineups'

const championById = new Map<string, Champion>([
  ['bruenor', { id: 'bruenor', name: { original: 'Bruenor', display: '布鲁诺' }, seat: 1, roles: [], affiliations: [], tags: [] }],
  ['jim', { id: 'jim', name: { original: 'Jim', display: '吉姆' }, seat: 2, roles: [], affiliations: [], tags: [] }],
])

const results = [
  { score: '1e10', carryHeroId: 'bruenor', placements: {}, explanations: [], warnings: [] },
  { score: '5e9', carryHeroId: 'jim', placements: {}, explanations: [], warnings: [] },
] as unknown as PlannerResult[]

describe('PlannerTopLineups', () => {
  it('results <= 1 时不渲染', () => {
    const { container } = render(
      <I18nProvider>
        <PlannerTopLineups results={[results[0]!]} selectedIndex={0} championById={championById} onSelect={() => {}} />
      </I18nProvider>,
    )

    expect(container.querySelector('.planner-top-lineups')).toBeNull()
  })

  it('渲染每个候选阵型标签并标记选中', () => {
    render(
      <I18nProvider>
        <PlannerTopLineups results={results} selectedIndex={1} championById={championById} onSelect={() => {}} />
      </I18nProvider>,
    )

    expect(screen.getByTestId('planner-top-lineup-tab-0')).toBeInTheDocument()
    expect(screen.getByTestId('planner-top-lineup-tab-1')).toHaveAttribute('aria-selected', 'true')
  })

  it('点击标签触发 onSelect(index)', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <I18nProvider>
        <PlannerTopLineups results={results} selectedIndex={0} championById={championById} onSelect={onSelect} />
      </I18nProvider>,
    )

    await user.click(screen.getByTestId('planner-top-lineup-tab-1'))

    expect(onSelect).toHaveBeenCalledWith(1)
  })
})
