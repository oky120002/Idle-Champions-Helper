import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SurfaceCardStatusStack } from '../../src/components/SurfaceCardStatusStack'

describe('SurfaceCardStatusStack', () => {
  it('按配置渲染可见的状态卡片与横幅', () => {
    const { container } = render(
      <SurfaceCardStatusStack
        items={[
          {
            id: 'loading',
            eyebrow: '英雄详情',
            title: '正在整理英雄卷宗…',
            description: '当前会加载结构化详情、成长轨道与技能信息。',
            statusItems: [
              {
                id: 'loading-banner',
                tone: 'info',
                children: '正在读取详情数据…',
              },
            ],
          },
          {
            id: 'hidden',
            title: '不会显示',
            statusItems: [
              {
                id: 'hidden-banner',
                tone: 'info',
                children: '不会显示',
              },
            ],
            hidden: true,
          },
        ]}
      />,
    )

    expect(container.querySelectorAll('.surface-card')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 2, name: '正在整理英雄卷宗…' })).toBeInTheDocument()
    expect(screen.getByText('当前会加载结构化详情、成长轨道与技能信息。')).toBeInTheDocument()
    expect(screen.getByText('正在读取详情数据…')).toBeInTheDocument()
    expect(screen.queryByText('不会显示')).not.toBeInTheDocument()
  })

  it('状态横幅全部隐藏时不渲染空卡片', () => {
    const { container } = render(
      <SurfaceCardStatusStack
        items={[
          {
            id: 'empty',
            title: '空卡片',
            statusItems: [
              {
                id: 'empty-banner',
                tone: 'info',
                children: '不会显示',
                hidden: true,
              },
            ],
          },
        ]}
      />,
    )

    expect(container.firstChild).toBeNull()
  })
})
