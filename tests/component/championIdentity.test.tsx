import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChampionIdentity } from '../../src/components/ChampionIdentity'
import type { Champion } from '../../src/domain/types'

const bruenor: Champion = {
  id: '1',
  name: {
    original: 'Bruenor',
    display: '布鲁诺',
  },
  seat: 1,
  roles: ['support'],
  affiliations: [],
  tags: ['support'],
  portrait: {
    path: 'v1/champion-portraits/1.png',
    sourceGraphic: 'Portraits/Portrait_Bruenor',
    sourceVersion: 7,
  },
}

describe('ChampionIdentity', () => {
  it('统一渲染头像、eyebrow 和双语名称头部', () => {
    render(<ChampionIdentity champion={bruenor} locale="zh-CN" eyebrow="1 号位" />)

    const avatar = screen.getByRole('img', { name: '布鲁诺头像' })

    expect(avatar).toHaveClass('champion-avatar--card')
    expect(screen.getByText('1 号位')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: '布鲁诺' })).toBeInTheDocument()
    expect(screen.getByText('Bruenor')).toBeInTheDocument()
  })

  it('支持自定义头像样式，并在没有副文本时省略 secondary 节点', () => {
    const { container } = render(
      <ChampionIdentity
        champion={{
          ...bruenor,
          name: {
            original: "Lae'zel",
            display: "Lae'zel",
          },
        }}
        locale="en-US"
        eyebrow="Seat 5"
        avatarClassName="champion-avatar--slot"
      />,
    )

    const avatar = screen.getByRole('img', { name: "Lae'zel portrait" })

    expect(avatar).toHaveClass('champion-avatar--slot')
    expect(screen.getByRole('heading', { level: 3, name: "Lae'zel" })).toBeInTheDocument()
    expect(container.querySelector('.result-card__secondary')).not.toBeInTheDocument()
  })
})
