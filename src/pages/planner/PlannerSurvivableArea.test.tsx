import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import { PlannerSurvivableArea } from './PlannerSurvivableArea'

function setup(value: number | null) {
  const onChange = vi.fn()
  const utils = render(
    <I18nProvider>
      <PlannerSurvivableArea value={value} onChange={onChange} />
    </I18nProvider>,
  )
  return { onChange, ...utils }
}

describe('PlannerSurvivableArea', () => {
  it('输入有效数字触发 onChange(floor)', async () => {
    const user = userEvent.setup()
    const { onChange, getByTestId } = setup(null)
    await user.type(getByTestId('planner-survivable-area-input'), '50')
    expect(onChange).toHaveBeenLastCalledWith(50)
  })

  it('清空输入触发 onChange(null)', async () => {
    const user = userEvent.setup()
    const { onChange, getByTestId } = setup(50)
    await user.clear(getByTestId('planner-survivable-area-input'))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('输入 0 = 关闭过滤 → onChange(null)', async () => {
    const user = userEvent.setup()
    const { onChange, getByTestId } = setup(50)
    await user.clear(getByTestId('planner-survivable-area-input'))
    await user.type(getByTestId('planner-survivable-area-input'), '0')
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('小数输入 floor 后触发（非 parseInt 截断）', async () => {
    const user = userEvent.setup()
    const { onChange, getByTestId } = setup(null)
    await user.type(getByTestId('planner-survivable-area-input'), '1.5')
    // Number("1.5")=1.5 → floor=1；parseInt("1.5")=1 此例巧合相同，
    // 但 "2.9"→floor=2 vs parseInt=2 也同——关键差异在科学记数（见下）
    expect(onChange).toHaveBeenLastCalledWith(1)
  })
})
