import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PrimaryNavigation } from '../../src/app/PrimaryNavigation'
import { resolveActiveNavigationItem, type TranslationFn } from '../../src/app/appNavigation'

const t: TranslationFn = (text) => text.zh

function renderPrimaryNavigation(pathname: string, state?: unknown) {
  const activeNavigationItem = resolveActiveNavigationItem(pathname, state)

  return render(
    <MemoryRouter initialEntries={[{ pathname, state }]}>
      <PrimaryNavigation
        activeNavigationItem={activeNavigationItem}
        isMobileNavOpen={false}
        locale="zh-CN"
        onLocaleSelect={() => undefined}
        onNavigate={() => undefined}
        t={t}
      />
    </MemoryRouter>,
  )
}

describe('PrimaryNavigation', () => {
  it('英雄详情页在没有来源状态时默认高亮英雄筛选', () => {
    renderPrimaryNavigation('/champions/7')

    expect(screen.getByRole('link', { name: '英雄筛选' })).toHaveClass('nav-link--active')
    expect(screen.getByRole('link', { name: '英雄筛选' })).toHaveAttribute('aria-current', 'page')
  })

  it('从立绘图鉴进入英雄详情时保持立绘图鉴导航高亮', () => {
    renderPrimaryNavigation('/champions/7', {
      returnTo: {
        pathname: '/illustrations',
        search: '?scope=skin',
      },
    })

    expect(screen.getByRole('link', { name: '立绘图鉴' })).toHaveClass('nav-link--active')
    expect(screen.getByRole('link', { name: '立绘图鉴' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '英雄筛选' })).not.toHaveClass('nav-link--active')
    expect(screen.getByRole('link', { name: '英雄筛选' })).not.toHaveAttribute('aria-current')
  })

  it('导航菜单不再渲染数字编号', () => {
    renderPrimaryNavigation('/champions')

    expect(document.querySelector('.nav-link__index')).toBeNull()
  })
})
