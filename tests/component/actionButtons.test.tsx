import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ActionButtons } from '../../src/components/ActionButtons'

describe('ActionButtons', () => {
  it('默认包裹 button-row，并按配置应用 tone、disabled 与容器类名', async () => {
    const user = userEvent.setup()
    const onPrimaryClick = vi.fn()
    const onSecondaryClick = vi.fn()
    const onGhostClick = vi.fn()

    render(
      <ActionButtons
        className="button-row result-card__section"
        items={[
          {
            id: 'primary',
            label: '主操作',
            disabled: true,
            onClick: onPrimaryClick,
          },
          {
            id: 'secondary',
            label: '次操作',
            tone: 'secondary',
            onClick: onSecondaryClick,
          },
          {
            id: 'ghost',
            label: '幽灵操作',
            tone: 'ghost',
            onClick: onGhostClick,
          },
        ]}
      />,
    )

    expect(document.querySelector('.button-row.result-card__section')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '主操作' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '次操作' })).toHaveClass('action-button--secondary')
    expect(screen.getByRole('button', { name: '幽灵操作' })).toHaveClass('action-button--ghost')

    await user.click(screen.getByRole('button', { name: '主操作' }))
    await user.click(screen.getByRole('button', { name: '次操作' }))
    await user.click(screen.getByRole('button', { name: '幽灵操作' }))

    expect(onPrimaryClick).not.toHaveBeenCalled()
    expect(onSecondaryClick).toHaveBeenCalledTimes(1)
    expect(onGhostClick).toHaveBeenCalledTimes(1)
  })

  it('wrap=false 时直接输出按钮，并过滤 hidden 项', () => {
    const onVisibleClick = vi.fn()
    const { container } = render(
      <ActionButtons
        wrap={false}
        items={[
          {
            id: 'visible',
            label: '保留按钮',
            onClick: onVisibleClick,
          },
          {
            id: 'hidden',
            label: '隐藏按钮',
            hidden: true,
            onClick: () => {},
          },
        ]}
      />,
    )

    expect(container.querySelector('.button-row')).toBeNull()
    expect(screen.getByRole('button', { name: '保留按钮' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '隐藏按钮' })).not.toBeInTheDocument()
  })
})
