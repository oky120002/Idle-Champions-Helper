import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChampionPill } from '../../src/components/ChampionPill'
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

describe('ChampionPill', () => {
  it('默认输出 seat 与双语名称组成的紧凑标签', () => {
    render(<ChampionPill champion={bruenor} locale="zh-CN" />)

    const avatar = screen.getByRole('img', { name: '布鲁诺头像' })

    expect(avatar).toHaveClass('champion-avatar--pill')
    expect(screen.getByText('1 号位 · 布鲁诺 · Bruenor')).toBeInTheDocument()
  })

  it('支持自定义标签，并保持头像的语言语义一致', () => {
    render(<ChampionPill champion={bruenor} locale="en-US" label="Seat 1 · Primary DPS" />)

    expect(screen.getByRole('img', { name: 'Bruenor portrait' })).toBeInTheDocument()
    expect(screen.getByText('Seat 1 · Primary DPS')).toBeInTheDocument()
    expect(screen.queryByText('Seat 1 · Bruenor · 布鲁诺')).not.toBeInTheDocument()
  })
})
