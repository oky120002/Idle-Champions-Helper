import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import { PlannerComputationMode } from './PlannerComputationMode'

describe('PlannerComputationMode', () => {
  it('渲染三档计算模式并标记当前值', () => {
    const { container } = render(
      <I18nProvider>
        <PlannerComputationMode value="p50" onChange={() => {}} />
      </I18nProvider>,
    )

    expect(container.querySelector('[data-computation-mode="p50"]')).toHaveAttribute('aria-checked', 'true')
    expect(container.querySelector('[data-computation-mode="p90"]')).toHaveAttribute('aria-checked', 'false')
    expect(container.querySelector('[data-computation-mode="full"]')).toHaveAttribute('aria-checked', 'false')
  })

  it('点击切换触发 onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { container } = render(
      <I18nProvider>
        <PlannerComputationMode value="p50" onChange={onChange} />
      </I18nProvider>,
    )

    await user.click(container.querySelector('[data-computation-mode="full"]')!)
    expect(onChange).toHaveBeenCalledWith('full')
  })

  it('点击当前值不触发 onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { container } = render(
      <I18nProvider>
        <PlannerComputationMode value="p50" onChange={onChange} />
      </I18nProvider>,
    )

    await user.click(container.querySelector('[data-computation-mode="p50"]')!)
    expect(onChange).not.toHaveBeenCalled()
  })
})
