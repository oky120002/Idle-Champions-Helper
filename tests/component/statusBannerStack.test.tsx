import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBannerStack } from '../../src/components/StatusBannerStack'

describe('StatusBannerStack', () => {
  it('按配置顺序渲染可见横幅，并透传标题与子内容', () => {
    const { container } = render(
      <StatusBannerStack
        items={[
          {
            id: 'success',
            tone: 'success',
            title: '解析成功',
            detail: '当前仅展示脱敏结果。',
          },
          {
            id: 'hidden',
            tone: 'info',
            children: '这条不该出现',
            hidden: true,
          },
          {
            id: 'warning',
            tone: 'error',
            children: <p className="status-banner__detail">请先修正字段格式。</p>,
          },
        ]}
      />,
    )

    expect(container.querySelectorAll('.status-banner')).toHaveLength(2)
    expect(screen.getByText('解析成功')).toBeInTheDocument()
    expect(screen.getByText('当前仅展示脱敏结果。')).toBeInTheDocument()
    expect(screen.getByText('请先修正字段格式。')).toBeInTheDocument()
    expect(screen.queryByText('这条不该出现')).not.toBeInTheDocument()
  })

  it('全部隐藏时不渲染任何内容', () => {
    const { container } = render(
      <StatusBannerStack
        items={[
          {
            id: 'hidden',
            tone: 'info',
            children: '不会显示',
            hidden: true,
          },
        ]}
      />,
    )

    expect(container.firstChild).toBeNull()
  })
})
