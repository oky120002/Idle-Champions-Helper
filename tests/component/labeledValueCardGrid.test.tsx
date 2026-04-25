import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LabeledValueCardGrid } from '../../src/components/LabeledValueCardGrid'

describe('LabeledValueCardGrid', () => {
  it('按配置渲染 label / value 卡片', () => {
    render(
      <LabeledValueCardGrid
        items={[
          { id: 'one', label: '当前布局', value: '巨龙奔袭' },
          { id: 'two', label: 'seat 冲突', value: '无' },
        ]}
        gridClassName="metric-grid"
        cardClassName="metric-card"
        labelClassName="metric-card__label"
        valueClassName="metric-card__value"
      />,
    )

    expect(document.querySelectorAll('.metric-card')).toHaveLength(2)
    expect(screen.getByText('当前布局')).toBeInTheDocument()
    expect(screen.getByText('巨龙奔袭')).toBeInTheDocument()
  })

  it('支持为单个值追加额外 className', () => {
    render(
      <LabeledValueCardGrid
        items={[
          {
            id: 'hash',
            label: '脱敏 Hash',
            value: 'abc***xyz',
            valueClassName: 'preview-card__value--mono',
          },
        ]}
        gridClassName="preview-grid"
        cardClassName="preview-card"
        labelClassName="preview-card__label"
        valueClassName="preview-card__value"
      />,
    )

    expect(screen.getByText('abc***xyz')).toHaveClass('preview-card__value--mono')
  })
})
