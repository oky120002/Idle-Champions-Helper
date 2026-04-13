import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { App } from '../../src/app/App'

describe('App', () => {
  it('在个人数据页完成本地导入 smoke 测试', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/user-data']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 2, name: '先把本地导入链路和安全边界立住' })).toBeInTheDocument()

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
      <MemoryRouter initialEntries={['/user-data']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('link', { name: '方案存档' }))

    expect(screen.getByRole('heading', { level: 2, name: '本地优先，后续接 IndexedDB' })).toBeInTheDocument()
  })
})
