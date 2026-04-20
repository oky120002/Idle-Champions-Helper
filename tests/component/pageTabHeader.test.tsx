import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../src/app/i18n'
import { PageTabHeader } from '../../src/components/PageTabHeader'
import { useDataVersionState } from '../../src/data/useDataVersionState'

vi.mock('../../src/data/useDataVersionState', () => ({
  useDataVersionState: vi.fn(),
}))

const mockedUseDataVersionState = vi.mocked(useDataVersionState)

describe('PageTabHeader', () => {
  it('headline 布局会把统计移到正文行，并允许只显示 accent 标签', () => {
    mockedUseDataVersionState.mockReturnValue({
      status: 'ready',
      data: {
        current: 'v1',
        updatedAt: '2026-04-18',
        notes: [],
      },
    })

    const { container } = render(
      <I18nProvider>
        <PageTabHeader
          accentLabel="CHAMPIONS"
          title="英雄筛选"
          aside={<span>总览统计</span>}
          layout="headline"
        />
      </I18nProvider>,
    )

    const topline = container.querySelector('.page-tab-header__topline')
    const body = container.querySelector('.page-tab-header__body')
    const eyebrow = container.querySelector('.page-tab-header__eyebrow')

    expect(topline).toBeInTheDocument()
    expect(topline).toContainElement(screen.getByText('CHAMPIONS'))
    expect(topline).toContainElement(screen.getByText('公共数据 v1'))
    expect(topline).toContainElement(screen.getByText('采集 2026-04-18'))
    expect(body).toContainElement(screen.getByText('总览统计'))
    expect(screen.getByRole('heading', { level: 2, name: '英雄筛选' })).toBeInTheDocument()
    expect(container.querySelector('.page-tab-header')).toHaveClass('page-tab-header--headline')
    expect(eyebrow).toHaveClass('page-tab-header__eyebrow--accent-only')
    expect(container.querySelector('.page-tab-header__description')).toBeNull()
  })
})
