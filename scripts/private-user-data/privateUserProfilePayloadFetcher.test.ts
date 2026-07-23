import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fetchAndStorePrivateUserProfilePayloads,
  PRIVATE_PLAY_SERVER_FALLBACK_BASE_URLS,
} from './private-user-profile-payloads.ts'

const TEST_HASH = 'abcdef1234567890abcdef1234567890'

describe('private user profile payload fetcher', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    vi.restoreAllMocks()
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
    tempDirs.length = 0
  })

  it('使用私有凭证抓取 payload 后，同时写入时间戳目录和 latest 目录', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'ic-private-user-'))
    tempDirs.push(cwd)
    await writeFile(
      path.join(cwd, '.env.private-user.local'),
      `IC_PRIVATE_USER_ID=12345678\nIC_PRIVATE_HASH=${TEST_HASH}\n`,
      'utf8',
    )

    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, play_server: 'https://ps28.idlechampions.com/~idledragons/' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, details: { instance_id: '7', heroes: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, campaigns: [{ campaign_id: '1', favor: '1.00e10' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, all_saves: [] }),
      })

    const result = await fetchAndStorePrivateUserProfilePayloads({
      cwd,
      env: {},
      fetchImpl,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(4)
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('call=getPlayServerForDefinitions')
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain('call=getuserdetails')
    expect(String(fetchImpl.mock.calls[2]?.[0])).toContain('call=getcampaigndetails')
    expect(String(fetchImpl.mock.calls[3]?.[0])).toContain('call=getallformationsaves')
    expect(String(fetchImpl.mock.calls[3]?.[0])).toContain('instance_id=7')

    const latestPayload: unknown = JSON.parse(
      await readFile(path.join(cwd, 'tmp/private-user-data/latest/user-profile-payloads.json'), 'utf8'),
    )
    const latestManifest = JSON.parse(
      await readFile(path.join(cwd, 'tmp/private-user-data/latest/manifest.json'), 'utf8'),
    ) as { maskedUserId: string; maskedHash: string }
    const timestampPayload: unknown = JSON.parse(
      await readFile(path.join(cwd, result.manifest.outputDir, 'user-profile-payloads.json'), 'utf8'),
    )

    expect(latestPayload).toEqual(timestampPayload)
    expect(latestPayload).toMatchObject({
      userDetails: { success: true },
      campaignDetails: { success: true },
      formationSaves: { success: true },
    })
    expect(latestManifest.maskedUserId).toBe('****5678')
    expect(latestManifest.maskedHash).toBe('****7890')
    expect(result.manifest.payloadName).toBe('user-profile-payloads.json')
    expect(result.latestDir).toBe(path.join(cwd, 'tmp/private-user-data/latest'))
  })

  it('未显式指定 baseUrl 时会回退到下一个官方 play server 镜像', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'ic-private-user-fallback-'))
    tempDirs.push(cwd)
    await writeFile(
      path.join(cwd, '.env.private-user.local'),
      `IC_PRIVATE_USER_ID=12345678\nIC_PRIVATE_HASH=${TEST_HASH}\n`,
      'utf8',
    )

    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error('master down'))
      .mockRejectedValueOnce(new Error('ps28 down'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, details: { instance_id: '7', heroes: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, campaigns: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, all_saves: [] }),
      })

    await fetchAndStorePrivateUserProfilePayloads({
      cwd,
      env: {},
      fetchImpl,
    })

    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain(PRIVATE_PLAY_SERVER_FALLBACK_BASE_URLS[0])
    expect(String(fetchImpl.mock.calls[2]?.[0])).toContain(PRIVATE_PLAY_SERVER_FALLBACK_BASE_URLS[1])
  })

  it('本地私有抓取也会跟随官方返回的 switch_play_server，但不会跟随非官方地址', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'ic-private-user-switch-'))
    tempDirs.push(cwd)
    await writeFile(
      path.join(cwd, '.env.private-user.local'),
      `IC_PRIVATE_USER_ID=12345678\nIC_PRIVATE_HASH=${TEST_HASH}\n`,
      'utf8',
    )

    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, switch_play_server: 'https://ps27.idlechampions.com/~idledragons/' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, details: { instance_id: '7', heroes: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, campaigns: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, all_saves: [] }),
      })

    await fetchAndStorePrivateUserProfilePayloads({
      cwd,
      env: {},
      fetchImpl,
      baseUrl: 'https://ps28.idlechampions.com/~idledragons/',
    })

    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('https://ps28.idlechampions.com/~idledragons/')
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain('https://ps27.idlechampions.com/~idledragons/')

    const blockedFetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, switch_play_server: 'https://evil.example.com/~idledragons/' }),
      })

    await expect(fetchAndStorePrivateUserProfilePayloads({
      cwd,
      env: {},
      fetchImpl: blockedFetchImpl,
      baseUrl: 'https://ps28.idlechampions.com/~idledragons/',
    })).rejects.toThrow('All official play server mirrors failed.')

    expect(blockedFetchImpl).toHaveBeenCalledTimes(1)
  })
})
