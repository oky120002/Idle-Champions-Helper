import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import { PlannerStackCount } from './PlannerStackCount'

describe('PlannerStackCount', () => {
  it('渲染当前值', () => {
    const { container } = render(
      <I18nProvider>
        <PlannerStackCount value={1930} onChange={() => {}} />
      </I18nProvider>,
    )
    expect((container.querySelector('[data-testid="planner-stack-count-input"]') as HTMLInputElement).value).toBe('1930')
  })

  it('输入有效正整数触发 onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { container } = render(
      <I18nProvider>
        <PlannerStackCount value={1000} onChange={onChange} />
      </I18nProvider>,
    )
    const input = container.querySelector('[data-testid="planner-stack-count-input"]') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '1930')
    expect(onChange).toHaveBeenLastCalledWith(1930)
  })

  it('无效输入（<1 或非数字）不触发 onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { container } = render(
      <I18nProvider>
        <PlannerStackCount value={1000} onChange={onChange} />
      </I18nProvider>,
    )
    const input = container.querySelector('[data-testid="planner-stack-count-input"]') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '0')
    expect(onChange).not.toHaveBeenCalled()
  })
})
