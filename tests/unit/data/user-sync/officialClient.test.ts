import { describe, expect, it } from 'vitest'
import {
  buildOfficialUrl,
  createReadonlyFetchOptions,
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
    const url = buildOfficialUrl('getuserdetails', {
      userId: '12345678',
      hash: 'abc123',
    })

    expect(url).toContain('getuserdetails')
    expect(url).toContain('user_id=12345678')
    expect(url).toContain('hash=abc123')
  })

  it('buildOfficialUrl 对拒绝端点抛错', () => {
    expect(() =>
      buildOfficialUrl('claim', { userId: '1', hash: 'a' }),
    ).toThrow(/not allowed/)
  })

  it('fetch options 包含安全约束', () => {
    const options = createReadonlyFetchOptions()

    expect(options.credentials).toBe('omit')
    expect(options.cache).toBe('no-store')
    expect(options.referrerPolicy).toBe('no-referrer')
  })
})
