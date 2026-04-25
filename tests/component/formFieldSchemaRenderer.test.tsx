import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormFieldSchemaRenderer } from '../../src/components/FormFieldSchemaRenderer'

describe('FormFieldSchemaRenderer', () => {
  it('按 schema 渲染 input、textarea、chip-single 和 split group', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    const onTypeChange = vi.fn()

    render(
      <FormFieldSchemaRenderer
        className="form-stack"
        fields={[
          {
            kind: 'input',
            id: 'keyword',
            inputId: 'formation-layout-search',
            label: '关键词',
            value: '',
            onChange: onSearchChange,
            placeholder: '搜布局名、来源战役、冒险或变体',
            className: 'form-field',
          },
          {
            kind: 'group',
            id: 'manual-group',
            layout: 'split',
            fields: [
              {
                kind: 'textarea',
                id: 'support-url',
                inputId: 'user-import-support-url',
                label: 'Support URL',
                value: '',
                onChange: () => {},
                rows: 5,
              },
              {
                kind: 'chip-single',
                id: 'scenario-type',
                label: '场景类型',
                value: 'all',
                onChange: onTypeChange,
                groupLabel: '场景类型',
                options: [
                  { value: 'all', label: '全部' },
                  { value: 'campaign', label: '战役' },
                ],
              },
            ],
          },
        ]}
      />,
    )

    expect(screen.getByRole('textbox', { name: '关键词' })).toHaveAttribute('id', 'formation-layout-search')
    expect(screen.getByRole('textbox', { name: 'Support URL' })).toHaveAttribute('id', 'user-import-support-url')
    expect(document.querySelector('.split-grid')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '场景类型' })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: '关键词' }), '巨龙')
    await user.click(screen.getByRole('button', { name: '战役' }))

    expect(onSearchChange).toHaveBeenCalled()
    expect(onTypeChange).toHaveBeenCalledWith('campaign')
  })

  it('全部字段隐藏时返回空', () => {
    const { container } = render(
      <FormFieldSchemaRenderer
        fields={[
          {
            kind: 'input',
            id: 'hidden-field',
            inputId: 'hidden-input',
            label: '隐藏字段',
            value: '',
            onChange: () => {},
            hidden: true,
          },
        ]}
      />,
    )

    expect(container.firstChild).toBeNull()
  })
})
