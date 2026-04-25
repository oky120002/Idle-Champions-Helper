import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusMessageBanner } from '../../src/components/StatusMessageBanner'
import {
  createErrorStatusMessage,
  createInfoStatusMessage,
  createSuccessStatusMessage,
} from '../../src/components/statusMessage'

describe('statusMessage helpers', () => {
  it('构造不同 tone 的状态消息', () => {
    expect(createInfoStatusMessage('信息', '说明')).toEqual({
      tone: 'info',
      title: '信息',
      detail: '说明',
    })
    expect(createSuccessStatusMessage('成功', '已完成')).toEqual({
      tone: 'success',
      title: '成功',
      detail: '已完成',
    })
    expect(createErrorStatusMessage('失败', '原因')).toEqual({
      tone: 'error',
      title: '失败',
      detail: '原因',
    })
  })

  it('用共享组件渲染状态消息 banner', () => {
    render(<StatusMessageBanner message={createSuccessStatusMessage('保存成功', '已写入本地浏览器')} />)

    expect(screen.getByText('保存成功')).toBeInTheDocument()
    expect(screen.getByText('已写入本地浏览器')).toBeInTheDocument()
  })
})
