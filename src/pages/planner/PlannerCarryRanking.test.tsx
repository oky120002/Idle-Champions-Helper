import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import type { Champion } from '../../domain/types'
import type { PlannerResult } from '../../domain/planner/recommendationTypes'
import { PlannerCarryRanking } from './PlannerCarryRanking'

const championById = new Map<string, Champion>([
  ['bruenor', { id: 'bruenor', name: { original: 'Bruenor', display: '布鲁诺' }, seat: 1, roles: [], affiliations: [], tags: [] }],
  ['jim', { id: 'jim', name: { original: 'Jim', display: '吉姆' }, seat: 2, roles: [], affiliations: [], tags: [] }],
])

const results = [
  { score: '1e10', carryHeroId: 'bruenor', placements: {}, explanations: [], warnings: [] },
  { score: '5e9', carryHeroId: 'jim', placements: {}, explanations: [], warnings: [] },
] as unknown as PlannerResult[]

describe('PlannerCarryRanking', () => {
  it('results 为空时不渲染', () => {
    const { container } = render(
      <I18nProvider>
        <PlannerCarryRanking results={[]} selectedIndex={0} championById={championById} onSelect={() => {}} />
      </I18nProvider>,
    )

    expect(container.querySelector('.planner-carry-ranking')).toBeNull()
  })

  it('按降序列出 carry 候选并标记选中', () => {
    render(
      <I18nProvider>
        <PlannerCarryRanking results={results} selectedIndex={0} championById={championById} onSelect={() => {}} />
      </I18nProvider>,
    )

    expect(screen.getByTestId('planner-carry-ranking-item-0')).toHaveClass('is-selected')
    expect(screen.getByTestId('planner-carry-ranking-item-1')).not.toHaveClass('is-selected')
    expect(screen.getByText('布鲁诺')).toBeInTheDocument()
    expect(screen.getByText('吉姆')).toBeInTheDocument()
  })

  it('点击候选项触发 onSelect(index)', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <I18nProvider>
        <PlannerCarryRanking results={results} selectedIndex={0} championById={championById} onSelect={onSelect} />
      </I18nProvider>,
    )

    await user.click(screen.getByTestId('planner-carry-ranking-item-1'))

    expect(onSelect).toHaveBeenCalledWith(1)
  })
})
