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

    await screen.findByRole('button', { name: '填入脱敏示例' })
    const toolbarTitle = document.querySelector('.workbench-page__toolbar-title')

    if (!(toolbarTitle instanceof HTMLElement)) {
      throw new Error('个人数据工具条标题不存在。')
    }

    expect(toolbarTitle).toHaveTextContent('个人数据')

    await user.click(screen.getByRole('button', { name: '填入脱敏示例' }))
    await user.click(screen.getByRole('button', { name: '读取并校验' }))

    expect(await screen.findByText('已在本地解析出一组合法凭证，当前页面仅展示脱敏结果，不会自动保存。')).toBeInTheDocument()
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

    await screen.findByRole('button', { name: '填入脱敏示例' })
    const toolbarTitle = document.querySelector('.workbench-page__toolbar-title')

    if (!(toolbarTitle instanceof HTMLElement)) {
      throw new Error('个人数据工具条标题不存在。')
    }

    expect(toolbarTitle).toHaveTextContent('个人数据')
    await user.click(screen.getByRole('link', { name: '方案存档' }))

    const presetsToolbarTitle = await screen.findByText('方案存档', { selector: '.workbench-page__toolbar-title' })
    expect(presetsToolbarTitle).toBeInTheDocument()
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
