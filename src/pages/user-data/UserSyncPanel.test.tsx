import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserSyncPanel } from './UserSyncPanel'
import { useUserSyncModel } from './useUserSyncModel'

vi.mock('./useUserSyncModel')

function mockModel(overrides: Partial<ReturnType<typeof useUserSyncModel>> = {}) {
  const base = {
    syncState: {
      status: 'loaded',
      snapshot: { ownedHeroes: [], importedFormationSaves: [], warnings: [] },
      ageDays: 1,
    },
    busy: false,
    canSync: true,
    canLoadLocalDevSnapshot: false,
    showLocalDevSnapshotAction: false,
    profileResolution: null,
    selectedProfileSource: 'browser-sync',
    localDevRefreshState: { status: 'idle' },
    handleSync: vi.fn(),
    handleSelectLocalDevSnapshot: vi.fn(),
    handleSelectProfileSource: vi.fn(),
    handleRefreshLocalDevSnapshot: vi.fn(),
    handleDelete: vi.fn(),
    reload: vi.fn(),
  } as unknown as ReturnType<typeof useUserSyncModel>
  vi.mocked(useUserSyncModel).mockReturnValue({ ...base, ...overrides })
}

describe('UserSyncPanel 删除确认弹窗', () => {
  beforeEach(() => {
    vi.mocked(useUserSyncModel).mockReset()
  })

  it('点击删除按钮打开确认弹窗', () => {
    mockModel()
    render(<UserSyncPanel />)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', '删除个人数据')
  })

  it('选择「同时清除覆盖」时调 handleDelete(true) 并关弹窗', () => {
    const handleDelete = vi.fn()
    mockModel({ handleDelete })
    render(<UserSyncPanel />)
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    fireEvent.click(screen.getByRole('button', { name: '同时清除覆盖' }))
    expect(handleDelete).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('选择「保留覆盖」时调 handleDelete(false)', () => {
    const handleDelete = vi.fn()
    mockModel({ handleDelete })
    render(<UserSyncPanel />)
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    fireEvent.click(screen.getByRole('button', { name: '保留覆盖' }))
    expect(handleDelete).toHaveBeenCalledWith(false)
  })

  it('取消不调 handleDelete 并关闭弹窗', () => {
    const handleDelete = vi.fn()
    mockModel({ handleDelete })
    render(<UserSyncPanel />)
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(handleDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
