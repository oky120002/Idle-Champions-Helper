import 'fake-indexeddb/auto'

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '../../src/app/i18n'
import { APP_DATABASE_NAME } from '../../src/data/localDatabase'
import {
  deleteUserProfileData,
  readCredentialVault,
  readUserProfileSnapshot,
  saveCredentialVault,
  saveUserProfileSnapshot,
} from '../../src/data/user-profile-store'
import { createUserProfileSnapshot } from '../../src/domain/user-profile/fixtures'
import { UserSyncPanel } from '../../src/pages/user-data/UserSyncPanel'

async function resetDatabase(): Promise<void> {
  await deleteUserProfileData().catch(() => {})
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)
    request.onerror = () => { reject(request.error ?? new Error('delete failed')) }
    request.onblocked = () => { resolve() }
    request.onsuccess = () => { resolve() }
  })
}

function renderSyncPanel() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/user-data']}>
        <UserSyncPanel />
      </MemoryRouter>
    </I18nProvider>,
  )
}

beforeEach(async () => {
  await resetDatabase()
})

afterEach(async () => {
  await resetDatabase()
})

describe('user data sync flow', () => {
  it('无 snapshot 时提供凭证解析和手动同步流程', async () => {
    renderSyncPanel()

    expect(screen.getByText(/尚未保存/i)).toBeInTheDocument()
    const section = screen.getByRole('region', { name: '同步状态' })
    expect(within(section).getByRole('button', { name: /^同步$/ })).toBeInTheDocument()
  })

  it('已有 3 天前的 snapshot 显示私人数据存在天数', async () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    await saveUserProfileSnapshot(
      createUserProfileSnapshot({ updatedAt: threeDaysAgo.toISOString() }),
    )

    renderSyncPanel()

    expect(await screen.findByText(/3 天前/)).toBeInTheDocument()
  })

  it('同步错误展示时不包含凭证', async () => {
    renderSyncPanel()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /模拟同步失败/i }))

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert.textContent).not.toMatch(/\d{6,}/)
      expect(alert.textContent).not.toMatch(/[0-9a-f]{32}/)
    })
  })

  it('点击删除会清除 snapshot 和可选 vault', async () => {
    await saveUserProfileSnapshot(createUserProfileSnapshot())
    await saveCredentialVault({ userId: '12345678', hash: 'abc123' })

    renderSyncPanel()

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /删除/i }))

    await waitFor(async () => {
      expect(await readUserProfileSnapshot()).toBeNull()
      expect(await readCredentialVault()).toBeNull()
    })

    expect(screen.getByText(/尚未保存/i)).toBeInTheDocument()
  })
})
