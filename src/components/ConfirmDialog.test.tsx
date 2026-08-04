import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('open=false 时不渲染', () => {
    const { container } = render(
      <ConfirmDialog open={false} title="确认" onClose={() => {}}>
        内容
      </ConfirmDialog>,
    )
    expect(container.querySelector('.confirm-dialog')).toBeNull()
  })

  it('open=true 时渲染标题与内容', () => {
    render(
      <ConfirmDialog open={true} title="删除个人数据" onClose={() => {}}>
        <p>是否继续？</p>
      </ConfirmDialog>,
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', '删除个人数据')
    expect(screen.getByText('删除个人数据')).toBeInTheDocument()
    expect(screen.getByText('是否继续？')).toBeInTheDocument()
  })

  it('点击遮罩触发 onClose', () => {
    const onClose = vi.fn()
    render(
      <ConfirmDialog open={true} title="确认" onClose={onClose}>
        <p>内容</p>
      </ConfirmDialog>,
    )
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('点击面板内容不冒泡到 onClose', () => {
    const onClose = vi.fn()
    render(
      <ConfirmDialog open={true} title="确认" onClose={onClose}>
        <p>内容</p>
      </ConfirmDialog>,
    )
    fireEvent.click(screen.getByText('内容'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
