import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from '../../src/app/App'
import { I18nProvider } from '../../src/app/i18n'

describe('App', () => {
  it('在个人数据页完成本地导入 smoke 测试', async () => {
    const user = userEvent.setup()

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/user-data']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )

    expect(screen.getByRole('heading', { level: 2, name: '在本地解析账号凭证并检查导入条件' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '填入脱敏示例' }))
    await user.click(screen.getByRole('button', { name: '读取并校验' }))

    expect(screen.getByText('已在本地解析出一组合法凭证，当前页面仅展示脱敏结果，不会自动保存。')).toBeInTheDocument()
    expect(screen.getByText('12***89')).toBeInTheDocument()
    expect(screen.getByText('abcdef***7890')).toBeInTheDocument()
    expect(screen.getByText('mobile')).toBeInTheDocument()
  })

  it('通过主导航切换到方案存档页', async () => {
    const user = userEvent.setup()

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/user-data']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )

    await user.click(screen.getByRole('link', { name: '方案存档' }))

    expect(screen.getByRole('heading', { level: 2, name: '管理保存在当前浏览器里的命名阵型方案' })).toBeInTheDocument()
  })

  it('通过低频语言设置入口切换到英文界面', async () => {
    const user = userEvent.setup()

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/user-data']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )

    const toolbarSwitcher = document.querySelector('.locale-switcher--toolbar')

    if (!(toolbarSwitcher instanceof HTMLElement)) {
      throw new Error('桌面语言入口不存在。')
    }

    const localeSwitch = within(toolbarSwitcher).getByRole('switch', { name: '界面语言' })
    expect(localeSwitch).toHaveAttribute('aria-checked', 'false')
    expect(localeSwitch).toHaveTextContent('中EN')
    expect(toolbarSwitcher.querySelector('.locale-switcher__toggle-copy')).toBeNull()

    await user.click(localeSwitch)

    expect(within(toolbarSwitcher).getByRole('switch', { name: 'Interface language' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Growth-Oriented Formation Desk' })).toBeInTheDocument()
  })
})
