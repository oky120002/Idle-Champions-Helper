import 'fake-indexeddb/auto'

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '../../src/app/i18n'
import { APP_DATABASE_NAME } from '../../src/data/localDatabase'
import {
  deleteUserProfileData,
  readUserProfileSnapshot,
  saveUserProfileSnapshot,
} from '../../src/data/user-profile-store'
import { createUserProfileSnapshot } from '../../src/domain/user-profile/fixtures'
import { PlannerProfileState } from '../../src/pages/planner/PlannerProfileState'

async function resetDatabase(): Promise<void> {
  await deleteUserProfileData().catch(() => {})
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)
    request.onerror = () => { reject(request.error ?? new Error('delete failed')) }
    request.onblocked = () => { resolve() }
    request.onsuccess = () => { resolve() }
  })
}

function renderProfileState() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <PlannerProfileState />
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

describe('PlannerProfileState', () => {
  it('无 profile 时显示跳转到用户数据页的链接', async () => {
    renderProfileState()

    const region = await screen.findByRole('region', { name: '个人数据状态' })
    const link = within(region).getByRole('link', { name: /前往个人数据/ })
    expect(link).toHaveAttribute('href', '/user-data')
  })

  it('已有 profile 显示数据存在天数', async () => {
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
    await saveUserProfileSnapshot(
      createUserProfileSnapshot({ updatedAt: fiveDaysAgo.toISOString() }),
    )

    renderProfileState()

    expect(await screen.findByText(/5 天/)).toBeInTheDocument()
  })

  it('同步警告可见但不会自动刷新', async () => {
    const oldSnapshot = new Date()
    oldSnapshot.setDate(oldSnapshot.getDate() - 10)
    await saveUserProfileSnapshot(
      createUserProfileSnapshot({ updatedAt: oldSnapshot.toISOString() }),
    )

    renderProfileState()

    // Warning should be visible
    expect(await screen.findByText(/数据可能过期/)).toBeInTheDocument()

    // Data should still be the old snapshot (no auto-refresh)
    const snapshot = await readUserProfileSnapshot()
    expect(snapshot).not.toBeNull()
    expect(new Date(snapshot!.updatedAt).getDate()).toBe(oldSnapshot.getDate())
  })
})
