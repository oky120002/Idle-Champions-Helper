import 'fake-indexeddb/auto'

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../app/i18n'
import { APP_DATABASE_NAME } from '../../data/localDatabase'
import {
  USER_PROFILE_SOURCE_PREFERENCE_STORAGE_KEY,
  deleteUserProfileData,
  readCredentialVault,
  readUserProfileSnapshot,
  saveCredentialVault,
  saveUserProfileSnapshot,
} from '../../data/user-profile-store'
import { createOwnedHero, createUserProfileSnapshot } from '../../domain/user-profile/fixtures'
import { UserDataPage } from '../UserDataPage'
import { UserSyncPanel } from './UserSyncPanel'

const TEST_USER_ID = '12345678'
const TEST_HASH = 'abcdef1234567890abcdef1234567890'

function createLocalDevPayload(heroIds: string[]) {
  return {
    userDetails: {
      success: true,
      details: {
        instance_id: '7',
        heroes: heroIds.map((heroId) => ({
          hero_id: heroId,
          level: 500,
          equipment: { 0: 3 },
          feats: [{ id: `feat-${heroId}` }],
          legendary_effects: [{ id: `leg-${heroId}` }],
        })),
      },
    },
    campaignDetails: {
      success: true,
      campaigns: [],
    },
    formationSaves: {
      success: true,
      all_saves: [],
    },
  }
}

async function resetDatabase(): Promise<void> {
  localStorage.removeItem(USER_PROFILE_SOURCE_PREFERENCE_STORAGE_KEY)
  await deleteUserProfileData().catch(() => {})
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)
    request.onerror = () => { reject(request.error ?? new Error('删除测试数据库失败。')) }
    // 阻塞即失败（与其余测试文件 plannerOverridesStore/formationStores/client 一致）：
    // 假装成功（resolve）会放过未删的库，残留状态泄漏到下一测。阻塞说明有未关连接，需暴露而非掩盖。
    request.onblocked = () => { reject(new Error('删除测试数据库被阻塞。')) }
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
          play_server: 'https://ps28.idlechampions.com/~idledragons/',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          switch_play_server: 'https://ps27.idlechampions.com/~idledragons/',
        }),
      })
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
      expect(screen.getByText(/浏览器同步快照已于/)).toBeInTheDocument()
      expect(screen.getByText(/同步警告 1 条/)).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('call=getPlayServerForDefinitions')
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('https://ps28.idlechampions.com/~idledragons/')
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain('https://ps27.idlechampions.com/~idledragons/')
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

  it('开发模式切换到本地开发快照时不会覆盖浏览器同步快照', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        userDetails: {
          details: {
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
        },
        campaignDetails: {
          campaigns: [{ campaign_id: '1', favor: '1.50e92' }],
        },
        formationSaves: {
          all_saves: [
            {
              formation_id: 'fm-1',
              layout_id: 'layout-grand-tour',
              adventure_id: '10',
              formation: { slot_1: '1' },
            },
          ],
        },
      }),
    }))

    renderSyncPanel()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '使用本地开发快照' }))

    await waitFor(() => {
      expect(screen.getByText(/当前开发数据源：本地开发快照/)).toBeInTheDocument()
      expect(screen.getByText(/当前选中源拥有英雄 1 个/)).toBeInTheDocument()
    })

    await expect(readUserProfileSnapshot()).resolves.toBeNull()
  })

  it('开发模式切换来源会显式持久化当前来源偏好', async () => {
    renderSyncPanel()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '使用本地开发快照' }))

    expect(localStorage.getItem(USER_PROFILE_SOURCE_PREFERENCE_STORAGE_KEY)).toBe('local-dev-snapshot')
    expect(screen.getByText(/当前开发数据源：本地开发快照/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '使用浏览器快照' }))

    expect(localStorage.getItem(USER_PROFILE_SOURCE_PREFERENCE_STORAGE_KEY)).toBe('browser-sync')
    expect(screen.getByText(/当前开发数据源：浏览器同步快照/)).toBeInTheDocument()
  })

  it('本地开发快照读取失败时不会清空既有浏览器同步快照', async () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    await saveUserProfileSnapshot(
      createUserProfileSnapshot({ updatedAt: twoDaysAgo.toISOString() }),
    )
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'missing snapshot' }),
    }))

    renderSyncPanel()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '使用本地开发快照' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/本地开发快照不可用|读取本地开发快照失败/)
    expect(screen.getByText(/浏览器同步快照已于 2 天前更新/)).toBeInTheDocument()

    const snapshot = await readUserProfileSnapshot()
    expect(snapshot?.updatedAt).toBe(twoDaysAgo.toISOString())
  })

  it('开发模式刷新本地开发快照时不会覆盖浏览器同步快照', async () => {
    const browserSnapshot = createUserProfileSnapshot({
      updatedAt: '2026-06-01T00:00:00.000Z',
      ownedHeroes: [
        createOwnedHero({
          heroId: 'browser-hero',
          level: 1234,
        }),
      ],
    })
    await saveUserProfileSnapshot(browserSnapshot)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        manifest: {
          timestamp: '2026-06-01T08:00:00.000Z',
          outputDir: 'tmp/private-user-data/2026-06-01T08-00-00-000Z',
          maskedUserId: '****5678',
          maskedHash: '****7890',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    renderSyncPanel()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '刷新本地开发快照' }))

    expect(await screen.findByRole('status')).toHaveTextContent('已刷新本地开发快照')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/__dev/private-user-data/refresh', {
      method: 'POST',
      cache: 'no-store',
    })
    await expect(readUserProfileSnapshot()).resolves.toEqual(browserSnapshot)
    expect(screen.getByText(/当前开发数据源：浏览器同步快照/)).toBeInTheDocument()
  })

  it('选中本地开发快照后刷新会重新读取最新 payload，且不写入 IndexedDB', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createLocalDevPayload(['1']),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          manifest: {
            timestamp: '2026-06-01T09:00:00.000Z',
            outputDir: 'tmp/private-user-data/2026-06-01T09-00-00-000Z',
            maskedUserId: '****5678',
            maskedHash: '****7890',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => createLocalDevPayload(['1', '2']),
      })
    vi.stubGlobal('fetch', fetchMock)

    renderSyncPanel()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '使用本地开发快照' }))

    await waitFor(() => {
      expect(screen.getByText(/当前选中源拥有英雄 1 个/)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '刷新本地开发快照' }))

    expect(await screen.findByRole('status')).toHaveTextContent('已刷新本地开发快照')
    await waitFor(() => {
      expect(screen.getByText(/当前选中源拥有英雄 2 个/)).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/__dev/private-user-data/user-profile-payloads', {
      cache: 'no-store',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/__dev/private-user-data/refresh', {
      method: 'POST',
      cache: 'no-store',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/__dev/private-user-data/user-profile-payloads', {
      cache: 'no-store',
    })
    await expect(readUserProfileSnapshot()).resolves.toBeNull()
  })

  it('同步错误展示时不包含凭证', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(`network ${TEST_USER_ID} ${TEST_HASH}`)))
    renderSyncPanel({ userId: TEST_USER_ID, hash: TEST_HASH })

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^手动同步$/ }))

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent(/官方数据同步失败/)
      expect(alert.textContent).not.toContain(TEST_USER_ID)
      expect(alert.textContent).not.toContain(TEST_HASH)
    })
  })

  it('点击删除会清除 snapshot 和可选 vault', async () => {
    await saveUserProfileSnapshot(createUserProfileSnapshot())
    await saveCredentialVault({ userId: '12345678', hash: 'abc123' })

    renderSyncPanel()

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /删除/i }))
    // 删除前弹窗让玩家选择是否同时清除手动能力覆盖；点「保留覆盖」继续删除。
    await user.click(await screen.findByRole('button', { name: '保留覆盖' }))

    await waitFor(async () => {
      expect(await readUserProfileSnapshot()).toBeNull()
      expect(await readCredentialVault()).toBeNull()
    })

    expect(screen.getByText(/尚未保存/i)).toBeInTheDocument()
  })
})
