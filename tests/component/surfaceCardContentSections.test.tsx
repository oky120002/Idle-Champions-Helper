import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SurfaceCardContentSections } from '../../src/components/SurfaceCardContentSections'

describe('SurfaceCardContentSections', () => {
  it('按配置渲染分栏标题、说明和列表', () => {
    render(
      <SurfaceCardContentSections
        eyebrow="导入边界"
        title="先把本地优先的数据导入骨架搭稳"
        description="这一页先验证浏览器内可完成的解析与脱敏预览。"
        layout="split"
        sections={[
          {
            id: 'supported',
            title: '当前已经支持的骨架',
            items: [
              {
                id: 'support-url',
                content: 'Support URL 本地解析',
              },
            ],
          },
          {
            id: 'next-stage',
            title: '下一阶段',
            detail: '继续沿用 local-first + 用户主动导入。',
            items: [
              {
                id: 'persist',
                content: '把已归一化的个人数据写入 IndexedDB',
              },
            ],
            listVariant: 'ordered',
          },
        ]}
      />,
    )

    expect(screen.getByRole('heading', { level: 2, name: '先把本地优先的数据导入骨架搭稳' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: '当前已经支持的骨架' })).toBeInTheDocument()
    expect(screen.getByText('Support URL 本地解析')).toBeInTheDocument()
    expect(screen.getByText('继续沿用 local-first + 用户主动导入。')).toBeInTheDocument()
    expect(document.querySelector('.split-grid')).toBeInTheDocument()
    expect(document.querySelectorAll('ul.bullet-list')).toHaveLength(1)
    expect(document.querySelector('.ordered-list')).toBeInTheDocument()
  })

  it('会跳过隐藏或空白 section', () => {
    const { container } = render(
      <SurfaceCardContentSections
        title="空内容"
        sections={[
          {
            id: 'hidden',
            title: '隐藏块',
            items: [
              {
                id: 'hidden-item',
                content: '不会显示',
              },
            ],
            hidden: true,
          },
          {
            id: 'empty',
          },
        ]}
      />,
    )

    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('不会显示')).not.toBeInTheDocument()
  })
})
