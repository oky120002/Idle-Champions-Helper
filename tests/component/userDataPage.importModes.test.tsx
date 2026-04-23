import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '../../src/app/i18n'
import { UserDataPage } from '../../src/pages/UserDataPage'

function renderUserDataPage() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/user-data']}>
        <UserDataPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}

describe('UserDataPage import modes', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('切换导入方式会重置解析状态，并且示例只填当前方式字段', async () => {
    const user = userEvent.setup()

    renderUserDataPage()

    await user.click(screen.getByRole('button', { name: '填入脱敏示例' }))
    await user.click(screen.getByRole('button', { name: '读取并校验' }))

    expect(await screen.findByText('已在本地解析出一组合法凭证，当前页面仅展示脱敏结果，不会自动保存。')).toBeInTheDocument()
    expect(screen.getByText('mobile')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '手动填写' }))

    expect(screen.getByText('这里适合先用脱敏样本验证格式，再考虑接真实导入和本地同步。')).toBeInTheDocument()
    expect(screen.queryByText('mobile')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'User ID' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Hash' })).toHaveValue('')

    await user.click(screen.getByRole('button', { name: '填入脱敏示例' }))

    expect(screen.getByRole('textbox', { name: 'User ID' })).toHaveValue('123456789')
    expect(screen.getByRole('textbox', { name: 'Hash' })).toHaveValue('abcdef1234567890abcdef1234567890')
    expect(screen.queryByRole('textbox', { name: '日志文本' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '日志文本' }))
    await user.click(screen.getByRole('button', { name: '填入脱敏示例' }))

    expect(screen.getByRole('textbox', { name: /^日志文本/ })).toHaveDisplayValue(/user_id=123456789/)
    expect(screen.queryByDisplayValue('123456789')).not.toBeInTheDocument()
  })

  it('只有 Support URL 成功解析后展示 network 卡片，其他方式不展示', async () => {
    const user = userEvent.setup()

    renderUserDataPage()

    await user.click(screen.getByRole('button', { name: '填入脱敏示例' }))
    await user.click(screen.getByRole('button', { name: '读取并校验' }))

    expect(await screen.findByText('推断 network')).toBeInTheDocument()
    expect(screen.getByText('mobile')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '手动填写' }))
    await user.click(screen.getByRole('button', { name: '填入脱敏示例' }))
    await user.click(screen.getByRole('button', { name: '读取并校验' }))

    await waitFor(() => {
      expect(screen.getByText('导入方式')).toBeInTheDocument()
    })

    expect(screen.queryByText('推断 network')).not.toBeInTheDocument()
    expect(screen.queryByText('mobile')).not.toBeInTheDocument()
    expect(screen.queryByText('当前输入未包含 network')).not.toBeInTheDocument()
  })

  it('日志文本解析失败时展示明确错误，并可通过切换方式回到 idle', async () => {
    const user = userEvent.setup()

    renderUserDataPage()

    await user.click(screen.getByRole('tab', { name: '日志文本' }))
    await user.type(screen.getByRole('textbox', { name: /^日志文本/ }), 'POST /only-user-id?user_id=123456789 HTTP/1.1')
    await user.click(screen.getByRole('button', { name: '读取并校验' }))

    expect(await screen.findByText('没在日志里找到 user_id 和 hash/device_hash。')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Support URL' }))

    expect(screen.getByText('这里适合先用脱敏样本验证格式，再考虑接真实导入和本地同步。')).toBeInTheDocument()
    expect(screen.queryByText('没在日志里找到 user_id 和 hash/device_hash。')).not.toBeInTheDocument()
  })
})
