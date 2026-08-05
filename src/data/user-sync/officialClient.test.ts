import { describe, expect, it, vi } from 'vitest'
import {
  buildOfficialUrl,
  OFFICIAL_PLAY_SERVER_FALLBACK_BASE_URLS,
  createReadonlyFetchOptions,
  fetchUserProfilePayloads,
  isAllowedEndpoint,
} from './officialClient'

describe('official read-only client', () => {
  it('允许 getuserdetails 调用', () => expect(isAllowedEndpoint('getuserdetails')).toBe(true))

  it('允许 getcampaigndetails 调用', () => expect(isAllowedEndpoint('getcampaigndetails')).toBe(true))

  it('允许 getallformationsaves 调用', () => expect(isAllowedEndpoint('getallformationsaves')).toBe(true))

  it('拒绝 claim 写入式调用', () => expect(isAllowedEndpoint('claim')).toBe(false))

  it('拒绝 purchase 写入式调用', () => expect(isAllowedEndpoint('purchase')).toBe(false))

  it('拒绝 save 写入式调用', () => expect(isAllowedEndpoint('save')).toBe(false))

  it('拒绝 redeem 写入式调用', () => expect(isAllowedEndpoint('redeem')).toBe(false))

  it('buildOfficialUrl 对允许端点返回 URL', () => {
    const url = buildOfficialUrl({
      endpoint: 'getuserdetails',
      credentials: {
        userId: '12345678',
        hash: 'abc123',
      },
    })

    expect(url).toContain('getuserdetails')
    expect(url).toContain('user_id=12345678')
    expect(url).toContain('hash=abc123')
    expect(url).toContain('mobile_client_version=999')
    expect(url).toContain('post.php?')
  })

  it('buildOfficialUrl 对拒绝端点抛错', () => {
    expect(() =>
      buildOfficialUrl({ endpoint: 'claim', credentials: { userId: '1', hash: 'a' } }),
    ).toThrow(/not allowed/)
  })

  it('fetch options 包含安全约束', () => {
    const options = createReadonlyFetchOptions()

    expect(options.credentials).toBe('omit')
    expect(options.cache).toBe('no-store')
    expect(options.referrerPolicy).toBe('no-referrer')
  })

  it('按官方只读顺序获取用户详情、地图进度和阵型保存', async () => {
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
        json: async () => ({ success: true, campaigns: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, all_saves: [] }),
      })

    const payloads = await fetchUserProfilePayloads(
      { userId: '12345678', hash: 'abcdef1234567890abcdef1234567890' },
      { fetchImpl },
    )

    expect(payloads.userDetails).toEqual({ success: true, details: { instance_id: '7', heroes: [] } })
    expect(fetchImpl).toHaveBeenCalledTimes(4)
    const calls = fetchImpl.mock.calls
    expect(String(calls[0]?.[0])).toContain('call=getPlayServerForDefinitions')
    expect(String(calls[1]?.[0])).toContain('call=getuserdetails')
    expect(String(calls[1]?.[0])).toContain('instance_key=1')
    expect(String(calls[2]?.[0])).toContain('call=getcampaigndetails')
    expect(String(calls[2]?.[0])).toContain('game_instance_id=1')
    expect(String(calls[2]?.[0])).toContain('instance_id=1')
    expect(String(calls[3]?.[0])).toContain('call=getallformationsaves')
    expect(String(calls[3]?.[0])).toContain('instance_id=7')
    for (const call of calls) {
      expect(call[1]).toMatchObject(createReadonlyFetchOptions())
    }
  })

  it('默认会在官方 play server 镜像之间回退', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error('master down'))
      .mockRejectedValueOnce(new Error('ps28 down'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, details: { instance_id: '9', heroes: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, campaigns: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, all_saves: [] }),
      })

    const payloads = await fetchUserProfilePayloads(
      { userId: '12345678', hash: 'abcdef1234567890abcdef1234567890' },
      { fetchImpl },
    )

    expect(payloads.userDetails).toEqual({ success: true, details: { instance_id: '9', heroes: [] } })
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain(OFFICIAL_PLAY_SERVER_FALLBACK_BASE_URLS[0])
    expect(String(fetchImpl.mock.calls[2]?.[0])).toContain(OFFICIAL_PLAY_SERVER_FALLBACK_BASE_URLS[1])
  })

  it('收到 switch_play_server 时会跟随官方返回的 play server 重试', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, switch_play_server: 'https://ps27.idlechampions.com/~idledragons/' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, details: { instance_id: '11', heroes: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, switch_play_server: 'https://ps29.idlechampions.com/~idledragons/' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, campaigns: [{ campaign_id: '1' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, switch_play_server: 'https://ps27.idlechampions.com/~idledragons/' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, all_saves: [] }),
      })

    const payloads = await fetchUserProfilePayloads(
      { userId: '12345678', hash: 'abcdef1234567890abcdef1234567890' },
      { fetchImpl, baseUrl: 'https://ps28.idlechampions.com/~idledragons/' },
    )

    expect(payloads).toMatchObject({
      userDetails: { success: true, details: { instance_id: '11' } },
      campaignDetails: { success: true, campaigns: [{ campaign_id: '1' }] },
      formationSaves: { success: true, all_saves: [] },
    })
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain('https://ps28.idlechampions.com/~idledragons/')
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain('https://ps27.idlechampions.com/~idledragons/')
    expect(String(fetchImpl.mock.calls[2]?.[0])).toContain('https://ps27.idlechampions.com/~idledragons/')
    expect(String(fetchImpl.mock.calls[3]?.[0])).toContain('https://ps29.idlechampions.com/~idledragons/')
    expect(String(fetchImpl.mock.calls[4]?.[0])).toContain('https://ps29.idlechampions.com/~idledragons/')
    expect(String(fetchImpl.mock.calls[5]?.[0])).toContain('https://ps27.idlechampions.com/~idledragons/')
  })

  it('拒绝跟随非官方 switch_play_server 地址', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, switch_play_server: 'https://evil.example.com/~idledragons/' }),
      })

    await expect(fetchUserProfilePayloads(
      { userId: '12345678', hash: 'abcdef1234567890abcdef1234567890' },
      { fetchImpl, baseUrl: 'https://ps28.idlechampions.com/~idledragons/' },
    )).rejects.toThrow('官方数据同步失败')

    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('同步失败时抛出安全错误，不包含完整 user id 或 hash', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network refused for user 12345678 abcdef1234567890abcdef1234567890'))

    await expect(fetchUserProfilePayloads(
      { userId: '12345678', hash: 'abcdef1234567890abcdef1234567890' },
      { fetchImpl },
    )).rejects.toThrow('官方数据同步失败')

    await expect(fetchUserProfilePayloads(
      { userId: '12345678', hash: 'abcdef1234567890abcdef1234567890' },
      { fetchImpl },
    )).rejects.not.toThrow(/12345678|abcdef1234567890abcdef1234567890/)
  })
})
