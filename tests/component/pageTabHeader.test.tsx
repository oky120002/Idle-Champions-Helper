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
  it('headline 布局在不显示标题时，仍会保留标签、版本和统计', () => {
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
          eyebrow="英雄筛选"
          accentLabel="CHAMPIONS"
          aside={<span>总览统计</span>}
          layout="headline"
        />
      </I18nProvider>,
    )

    const topline = container.querySelector('.page-tab-header__topline')
    const body = container.querySelector('.page-tab-header__body')
    const eyebrow = container.querySelector('.page-tab-header__eyebrow')

    expect(topline).toBeInTheDocument()
    expect(topline).toContainElement(screen.getByText('英雄筛选'))
    expect(topline).toContainElement(screen.getByText('CHAMPIONS'))
    expect(topline).toContainElement(screen.getByText('公共数据 v1'))
    expect(topline).toContainElement(screen.getByText('采集 2026-04-18'))
    expect(topline).toContainElement(screen.getByText('总览统计'))
    expect(container.querySelector('.page-tab-header')).toHaveClass('page-tab-header--headline')
    expect(container.querySelector('.page-tab-header')).toHaveClass('page-tab-header--titleless')
    expect(eyebrow).not.toHaveClass('page-tab-header__eyebrow--accent-only')
    expect(container.querySelector('.page-tab-header__title')).toBeNull()
    expect(body).toBeNull()
  })

  it('没有 eyebrow 时仍然允许只显示 accent 标签，并按需显示标题', () => {
    mockedUseDataVersionState.mockReturnValue({
      status: 'error',
      data: null,
    } as ReturnType<typeof useDataVersionState>)

    const { container } = render(
      <I18nProvider>
        <PageTabHeader accentLabel="PRESETS" title="管理保存在当前浏览器里的命名阵型方案" />
      </I18nProvider>,
    )

    expect(container.querySelector('.page-tab-header__eyebrow')).toHaveClass('page-tab-header__eyebrow--accent-only')
    expect(screen.getByText('PRESETS')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '管理保存在当前浏览器里的命名阵型方案' })).toBeInTheDocument()
  })
})
