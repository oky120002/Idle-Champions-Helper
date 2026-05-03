import 'fake-indexeddb/auto'

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
import { UserDataPage } from '../../src/pages/UserDataPage'
import { UserSyncPanel } from '../../src/pages/user-data/UserSyncPanel'

const TEST_USER_ID = '12345678'
const TEST_HASH = 'abcdef1234567890abcdef1234567890'

async function resetDatabase(): Promise<void> {
  await deleteUserProfileData().catch(() => {})
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)
    request.onerror = () => { reject(request.error ?? new Error('delete failed')) }
    request.onblocked = () => { resolve() }
    request.onsuccess = () => { resolve() }
  })
}

function renderSyncPanel(credentials?: { userId: string; hash: string }) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/user-data']}>
        <UserSyncPanel credentials={credentials ?? null} />
      </MemoryRouter>
    </I18nProvider>,
  )
}

function renderUserDataPage() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/user-data']}>
        <UserDataPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}

beforeEach(async () => {
  await resetDatabase()
})

afterEach(async () => {
  vi.restoreAllMocks()
  await resetDatabase()
})

describe('user data sync flow', () => {
  it('个人数据页挂载同步状态面板', async () => {
    renderUserDataPage()

    expect(await screen.findByRole('region', { name: '同步状态' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^手动同步$/ })).toBeDisabled()
  })

  it('无 snapshot 时提供凭证解析和手动同步流程', async () => {
    renderSyncPanel()

    expect(screen.getByText(/尚未保存/i)).toBeInTheDocument()
    const section = screen.getByRole('region', { name: '同步状态' })
    expect(within(section).getByRole('button', { name: /^手动同步$/ })).toBeDisabled()
    expect(within(section).getByText(/先读取并校验凭证/i)).toBeInTheDocument()
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

  it('手动同步会使用已解析凭证读取官方只读数据并写入 IndexedDB', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          details: {
            instance_id: '7',
            heroes: [
              {
                hero_id: '1',
                level: 500,
                equipment: { 0: 3 },
                feats: [{ id: 'feat-1' }],
                legendary_effects: [{ id: 'leg-1' }],
              },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          campaigns: [{ campaign_id: '1', favor: '1.50e92' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          all_saves: [
            {
              formation_id: 'fm-1',
              layout_id: 'layout-grand-tour',
              adventure_id: '10',
              formation: { slot_1: '1' },
              specializations: { 1: 'spec-a' },
            },
          ],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    renderUserDataPage()

    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: '手动填写' }))
    await user.type(screen.getByRole('textbox', { name: 'User ID' }), TEST_USER_ID)
    await user.type(screen.getByRole('textbox', { name: 'Hash' }), TEST_HASH)
    await user.click(screen.getByRole('button', { name: '读取并校验' }))
    await user.click(await screen.findByRole('button', { name: /^手动同步$/ }))

    await waitFor(() => {
      expect(screen.getByText(/拥有英雄 1 个/)).toBeInTheDocument()
      expect(screen.getByText(/已导入阵型 1 个/)).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    const snapshot = await readUserProfileSnapshot()
    expect(snapshot?.ownedHeroes[0]).toMatchObject({
      heroId: '1',
      level: 500,
      feats: ['feat-1'],
      legendaryEffects: ['leg-1'],
    })
    expect(snapshot?.importedFormationSaves[0]).toMatchObject({
      formationId: 'fm-1',
      layoutId: 'layout-grand-tour',
    })
    expect(screen.queryByText(TEST_USER_ID)).not.toBeInTheDocument()
    expect(screen.queryByText(TEST_HASH)).not.toBeInTheDocument()
    for (const [, options] of fetchMock.mock.calls) {
      expect(options).toMatchObject({
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
      })
    }
  })

  it('同步错误展示时不包含凭证', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(`network ${TEST_USER_ID} ${TEST_HASH}`)))
    renderSyncPanel({ userId: TEST_USER_ID, hash: TEST_HASH })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^手动同步$/ }))

    const alert = await screen.findByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert.textContent).toMatch(/官方数据同步失败/)
    expect(alert.textContent).not.toContain(TEST_USER_ID)
    expect(alert.textContent).not.toContain(TEST_HASH)
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
