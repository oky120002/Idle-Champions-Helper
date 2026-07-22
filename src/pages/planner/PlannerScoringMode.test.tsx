import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import { PlannerScoringMode } from './PlannerScoringMode'

describe('PlannerScoringMode', () => {
  it('渲染两个模式，初始 carry-dps 选中', () => {
    render(
      <I18nProvider>
        <PlannerScoringMode value="carry-dps" onChange={() => {}} />
      </I18nProvider>,
    )

    const carry = screen.getByRole('radio', { name: /输出|Damage/i })
    const gold = screen.getByRole('radio', { name: /金币|Gold/i })
    expect(carry).toHaveAttribute('aria-checked', 'true')
    expect(gold).toHaveAttribute('aria-checked', 'false')
  })

  it('点击金币模式触发 onChange("team-gold")', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <I18nProvider>
        <PlannerScoringMode value="carry-dps" onChange={onChange} />
      </I18nProvider>,
    )

    await user.click(screen.getByRole('radio', { name: /金币|Gold/i }))
    expect(onChange).toHaveBeenCalledWith('team-gold')
  })

  it('当前选中模式不重复触发 onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <I18nProvider>
        <PlannerScoringMode value="team-gold" onChange={onChange} />
      </I18nProvider>,
    )

    await user.click(screen.getByRole('radio', { name: /金币|Gold/i }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
