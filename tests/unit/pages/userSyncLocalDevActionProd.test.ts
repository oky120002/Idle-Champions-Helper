import { describe, expect, it, vi } from 'vitest'

import {
  canUseLocalDevSnapshotAction,
  refreshLocalDevSnapshot,
  trySelectLocalDevSnapshot,
} from '../../../src/pages/user-data/userSyncLocalDevAction.prod'

describe('production user sync local dev action', () => {
  it('生产构建永远禁用本地开发快照动作', () => {
    expect(canUseLocalDevSnapshotAction()).toBe(false)
  })

  it('生产构建不会执行本地开发快照切换', () => {
    const selectProfileSource = vi.fn()

    expect(trySelectLocalDevSnapshot(selectProfileSource)).toBe(false)
    expect(selectProfileSource).not.toHaveBeenCalled()
  })

  it('生产构建不会允许刷新本地开发快照', async () => {
    await expect(refreshLocalDevSnapshot()).rejects.toThrow('生产构建不允许刷新本地开发快照。')
  })
})
