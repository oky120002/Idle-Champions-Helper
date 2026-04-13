import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChampionAvatar } from '../../src/components/ChampionAvatar'
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

describe('ChampionAvatar', () => {
  it('渲染版本化头像资源，并按当前语言输出 alt 文案', () => {
    render(<ChampionAvatar champion={bruenor} locale="zh-CN" className="champion-avatar--card" loading="eager" />)

    const avatar = screen.getByRole('img', { name: '布鲁诺头像' })

    expect(avatar).toHaveAttribute('src', '/data/v1/champion-portraits/1.png')
    expect(avatar).toHaveAttribute('loading', 'eager')
    expect(avatar).toHaveClass('champion-avatar', 'champion-avatar--card')
  })

  it('缺少头像资源时回退为当前语言主名称首字母', () => {
    render(
      <ChampionAvatar
        champion={{
          ...bruenor,
          name: {
            original: 'Briv',
            display: 'Briv',
          },
          portrait: null,
        }}
        locale="en-US"
        className="champion-avatar--pill"
      />,
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()

    const fallback = screen.getByText('B')
    expect(fallback).toHaveClass('champion-avatar', 'champion-avatar--pill', 'champion-avatar--fallback')
    expect(fallback).toHaveAttribute('aria-hidden', 'true')
  })
})
