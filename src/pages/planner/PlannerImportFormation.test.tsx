import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import type { PlannerResult } from '../../domain/planner/recommendationTypes'

import { saveRecentFormationDraft } from '../../data/formationDraftStore'
import { PlannerImportFormation } from './PlannerImportFormation'

vi.mock('../../data/client', () => ({
  loadVersion: vi.fn(async () => ({ current: 'v1' })),
}))
vi.mock('../../data/formationDraftStore', () => ({
  saveRecentFormationDraft: vi.fn(async () => {}),
}))

const result = {
  objectiveValue: '1e10',
  carryHeroId: 'bruenor',
  placements: { s1: 'bruenor' },
  explanations: [],
  warnings: [],
} as unknown as PlannerResult

describe('PlannerImportFormation', () => {
  it('无结果或无 layoutId 时不渲染', () => {
    const { container } = render(
      <I18nProvider>
        <MemoryRouter>
          <PlannerImportFormation result={null} layoutId="L1" scenarioRef={null} />
        </MemoryRouter>
      </I18nProvider>,
    )

    expect(container.querySelector('.planner-import-formation')).toBeNull()
  })

  it('点击导入写入 formationDraft（layoutId + placements + scenarioRef）', async () => {
    const user = userEvent.setup()

    render(
      <I18nProvider>
        <MemoryRouter>
          <PlannerImportFormation
            result={result}
            layoutId="layout-1"
            scenarioRef={{ kind: 'variant', id: 'v1' }}
          />
        </MemoryRouter>
      </I18nProvider>,
    )

    await user.click(screen.getByTestId('planner-import-formation'))

    expect(vi.mocked(saveRecentFormationDraft)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(saveRecentFormationDraft)).toHaveBeenCalledWith(
      expect.objectContaining({
        layoutId: 'layout-1',
        placements: { s1: 'bruenor' },
        scenarioRef: { kind: 'variant', id: 'v1' },
        schemaVersion: 1,
        dataVersion: 'v1',
      }),
    )
  })
})
