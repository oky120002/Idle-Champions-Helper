import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PresetFormFields, type PresetFormFieldValue } from '../../src/components/PresetFormFields'
import type { PresetPriority } from '../../src/domain/types'

const defaultValue: PresetFormFieldValue = {
  name: '推图常用队',
  description: '先拿来做组件测试',
  scenarioTagsInput: '推图, 速刷',
  priority: 'medium',
}

function renderPresetFormFields(
  overrides: Partial<ComponentProps<typeof PresetFormFields>> = {},
) {
  const onChange = vi.fn()

  render(
    <PresetFormFields
      value={defaultValue}
      priorityOptions={['medium', 'high', 'low']}
      nameInputId="preset-name"
      descriptionInputId="preset-description"
      tagsInputId="preset-tags"
      nameLabel="方案名称"
      descriptionLabel="方案备注"
      tagsLabel="场景标签"
      priorityLabel="优先级"
      getPriorityOptionLabel={(option: PresetPriority) =>
        option === 'high' ? '高优先' : option === 'low' ? '备用' : '常用'
      }
      onChange={onChange}
      {...overrides}
    />,
  )

  return { onChange }
}

describe('PresetFormFields', () => {
  it('按配置渲染输入字段、提示和优先级按钮', () => {
    renderPresetFormFields({
      namePlaceholder: '例如：速刷常用 10 槽波形',
      tagsHint: '仅作用户可读标签，不作为恢复主键。',
    })

    expect(screen.getByRole('textbox', { name: '方案名称' })).toHaveAttribute('id', 'preset-name')
    expect(screen.getByRole('textbox', { name: '方案名称' })).toHaveAttribute('placeholder', '例如：速刷常用 10 槽波形')
    expect(screen.getByRole('textbox', { name: '方案备注' })).toHaveValue('先拿来做组件测试')
    expect(screen.getByRole('textbox', { name: '场景标签' })).toHaveValue('推图, 速刷')
    expect(screen.getByText('仅作用户可读标签，不作为恢复主键。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '常用' })).toHaveClass('segmented-control__button--active')
  })

  it('交互时把字段更新委托给外部回调', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPresetFormFields()

    await user.clear(screen.getByRole('textbox', { name: '方案名称' }))
    await user.type(screen.getByRole('textbox', { name: '方案名称' }), '新方案')
    await user.click(screen.getByRole('button', { name: '高优先' }))

    expect(onChange).toHaveBeenCalledWith('name', '')
    expect(
      onChange.mock.calls.some(
        ([key, value]) => key === 'name' && typeof value === 'string' && value.includes('新'),
      ),
    ).toBe(true)
    expect(onChange).toHaveBeenCalledWith('priority', 'high')
  })
})
