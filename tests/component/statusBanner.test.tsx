import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBanner } from '../../src/components/StatusBanner'

describe('StatusBanner', () => {
  it('支持直接渲染简单提示文案', () => {
    const { container } = render(<StatusBanner tone="info">正在读取数据…</StatusBanner>)

    expect(container.querySelector('.status-banner--info')).toBeInTheDocument()
    expect(screen.getByText('正在读取数据…')).toBeInTheDocument()
  })

  it('支持标题、详情、补充内容和操作区', () => {
    const { container } = render(
      <StatusBanner
        tone="error"
        title="恢复失败"
        detail="当前版本没有可用布局。"
        meta={<span>保存版本：v0</span>}
        actions={<button type="button">关闭</button>}
      >
        <p className="status-banner__detail">请先刷新公共数据。</p>
      </StatusBanner>,
    )

    expect(container.querySelector('.status-banner--error')).toBeInTheDocument()
    expect(screen.getByText('恢复失败')).toBeInTheDocument()
    expect(screen.getByText('当前版本没有可用布局。')).toBeInTheDocument()
    expect(screen.getByText('请先刷新公共数据。')).toBeInTheDocument()
    expect(screen.getByText('保存版本：v0')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument()
  })
})
