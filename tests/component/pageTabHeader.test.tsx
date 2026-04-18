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
  it('把公共数据元信息并到首行，并且不再渲染副标题', () => {
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
          title="按座位、定位与联动快速缩小候选英雄"
          aside={<span>总览统计</span>}
        />
      </I18nProvider>,
    )

    const topline = container.querySelector('.page-tab-header__topline')

    expect(topline).toBeInTheDocument()
    expect(topline).toContainElement(screen.getByText('英雄筛选'))
    expect(topline).toContainElement(screen.getByText('CHAMPIONS'))
    expect(topline).toContainElement(screen.getByText('公共数据 v1'))
    expect(topline).toContainElement(screen.getByText('采集 2026-04-18'))
    expect(topline).toContainElement(screen.getByText('总览统计'))
    expect(screen.getByRole('heading', { level: 2, name: '按座位、定位与联动快速缩小候选英雄' })).toBeInTheDocument()
    expect(container.querySelector('.page-tab-header__description')).toBeNull()
  })
})
