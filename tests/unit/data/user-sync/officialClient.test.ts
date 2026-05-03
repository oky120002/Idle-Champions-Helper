import { describe, expect, it, vi } from 'vitest'
import {
  buildOfficialUrl,
  createReadonlyFetchOptions,
  fetchUserProfilePayloads,
  isAllowedEndpoint,
} from '../../../../src/data/user-sync/officialClient'

describe('official read-only client', () => {
  it('允许 getuserdetails 调用', () => {
    expect(isAllowedEndpoint('getuserdetails')).toBe(true)
  })

  it('允许 getcampaigndetails 调用', () => {
    expect(isAllowedEndpoint('getcampaigndetails')).toBe(true)
  })

  it('允许 getallformationsaves 调用', () => {
    expect(isAllowedEndpoint('getallformationsaves')).toBe(true)
  })

  it('拒绝 claim 写入式调用', () => {
    expect(isAllowedEndpoint('claim')).toBe(false)
  })

  it('拒绝 purchase 写入式调用', () => {
    expect(isAllowedEndpoint('purchase')).toBe(false)
  })

  it('拒绝 save 写入式调用', () => {
    expect(isAllowedEndpoint('save')).toBe(false)
  })

  it('拒绝 redeem 写入式调用', () => {
    expect(isAllowedEndpoint('redeem')).toBe(false)
  })

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
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    const calls = fetchImpl.mock.calls
    expect(String(calls[0]?.[0])).toContain('call=getuserdetails')
    expect(String(calls[0]?.[0])).toContain('instance_key=1')
    expect(String(calls[1]?.[0])).toContain('call=getcampaigndetails')
    expect(String(calls[1]?.[0])).toContain('game_instance_id=1')
    expect(String(calls[1]?.[0])).toContain('instance_id=1')
    expect(String(calls[2]?.[0])).toContain('call=getallformationsaves')
    expect(String(calls[2]?.[0])).toContain('instance_id=7')
    for (const call of calls) {
      expect(call[1]).toMatchObject(createReadonlyFetchOptions())
    }
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
