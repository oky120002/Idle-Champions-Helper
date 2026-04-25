import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ActionButton } from '../../src/components/ActionButton'
import { buildActionButtonClassName } from '../../src/components/actionButtonClassName'

describe('ActionButton', () => {
  it('按配置拼装 compact、toggled、tone 与额外类名', () => {
    expect(
      buildActionButtonClassName({
        tone: 'secondary',
        compact: true,
        toggled: true,
        className: 'workbench-page__toolbar-action',
      }),
    ).toBe(
      'action-button action-button--secondary action-button--compact action-button--toggled workbench-page__toolbar-action',
    )
  })

  it('渲染按钮并保留 aria 状态与点击行为', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      <ActionButton
        tone="ghost"
        compact
        toggled
        ariaPressed
        ariaLabel="复制当前链接"
        className="workbench-page__toolbar-action"
        onClick={handleClick}
      >
        已复制链接
      </ActionButton>,
    )

    const button = screen.getByRole('button', { name: '复制当前链接' })

    expect(button).toHaveClass('action-button--ghost')
    expect(button).toHaveClass('action-button--compact')
    expect(button).toHaveClass('action-button--toggled')
    expect(button).toHaveClass('workbench-page__toolbar-action')
    expect(button).toHaveAttribute('aria-pressed', 'true')

    await user.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(screen.getByText('已复制链接')).toBeInTheDocument()
  })
})
