import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldGroup } from '../../src/components/FieldGroup'

describe('FieldGroup', () => {
  it('默认渲染带 htmlFor 的字段块和提示文本', () => {
    render(
      <FieldGroup label="方案名称" labelFor="preset-name" hint="名称会展示在方案列表里。">
        <input id="preset-name" type="text" />
      </FieldGroup>,
    )

    expect(screen.getByLabelText('方案名称')).toHaveAttribute('id', 'preset-name')
    expect(screen.getByText('名称会展示在方案列表里。')).toBeInTheDocument()
  })

  it('支持 label 包裹输入控件与自定义容器类名', () => {
    const { container } = render(
      <FieldGroup label="关键词" hint="支持中英混搜。" as="label" className="filter-group">
        <input type="text" />
      </FieldGroup>,
    )

    expect(container.querySelector('.filter-group')).toBeInTheDocument()
    expect(screen.getByText('关键词')).toBeInTheDocument()
    expect(screen.getByText('支持中英混搜。')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})
