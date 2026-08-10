import { describe, expect, it } from 'vitest'

import type { UserProfileResolution } from '../../data/user-profile-store'

import { getUserHeroProfileSourceLabel } from './userHeroProfileSourceLabel.prod'

const syncedResolution = { resolvedSource: 'browser-sync' } as UserProfileResolution

describe('production user hero profile source label', () => {
  it('zh-CN + 已同步 → 浏览器同步快照', () => {
    expect(getUserHeroProfileSourceLabel(syncedResolution, 'zh-CN')).toBe('浏览器同步快照')
  })

  it('en-US + 已同步 → Browser sync snapshot', () => {
    expect(getUserHeroProfileSourceLabel(syncedResolution, 'en-US')).toBe('Browser sync snapshot')
  })

  it('zh-CN + 未同步 → 未同步账号快照', () => {
    expect(getUserHeroProfileSourceLabel(null, 'zh-CN')).toBe('未同步账号快照')
  })

  it('en-US + 未同步 → No synced account snapshot', () => {
    expect(getUserHeroProfileSourceLabel(null, 'en-US')).toBe('No synced account snapshot')
  })
})
