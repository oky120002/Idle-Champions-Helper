import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import { PlannerCandidateMode } from './PlannerCandidateMode'

describe('PlannerCandidateMode', () => {
  it('渲染三档候选范围并标记当前值', () => {
    const { container } = render(
      <I18nProvider>
        <PlannerCandidateMode value="owned-only" onChange={() => {}} />
      </I18nProvider>,
    )

    expect(container.querySelector('[data-candidate-mode="owned-only"]')).toHaveAttribute('aria-checked', 'true')
    expect(container.querySelector('[data-candidate-mode="all-hypothetical"]')).toHaveAttribute('aria-checked', 'false')
    expect(container.querySelector('[data-candidate-mode="manual-override"]')).toBeInTheDocument()
  })

  it('点击切换触发 onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { container } = render(
      <I18nProvider>
        <PlannerCandidateMode value="owned-only" onChange={onChange} />
      </I18nProvider>,
    )

    await user.click(container.querySelector('[data-candidate-mode="all-hypothetical"]')!)

    expect(onChange).toHaveBeenCalledWith('all-hypothetical')
  })
})
