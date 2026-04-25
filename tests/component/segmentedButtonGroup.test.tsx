import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedButtonGroup } from '../../src/components/SegmentedButtonGroup'

describe('SegmentedButtonGroup', () => {
  it('默认按 group 语义渲染并维护 aria-pressed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SegmentedButtonGroup
        value="medium"
        items={[
          { value: 'medium', label: '常用' },
          { value: 'high', label: '高优先' },
        ]}
        ariaLabel="优先级"
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('group', { name: '优先级' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '常用' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '高优先' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: '高优先' }))

    expect(onChange).toHaveBeenCalledWith('high')
  })

  it('支持 tablist 语义并维护 aria-selected', () => {
    render(
      <SegmentedButtonGroup
        value="manual"
        items={[
          { value: 'supportUrl', label: 'Support URL' },
          { value: 'manual', label: '手动填写' },
          { value: 'webRequestLog', label: '日志文本' },
        ]}
        ariaLabel="个人数据导入方式"
        onChange={() => {}}
        mode="tablist"
      />,
    )

    expect(screen.getByRole('tablist', { name: '个人数据导入方式' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '手动填写' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Support URL' })).toHaveAttribute('aria-selected', 'false')
  })
})
