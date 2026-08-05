import 'fake-indexeddb/auto'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../data/client', () => ({
  loadVersion: vi.fn(async () => ({ current: 'v1' })),
}))

import { I18nProvider } from '../../app/i18n'
import { listFormationPresets } from '../../data/formationPresetStore'
import { APP_DATABASE_NAME } from '../../data/localDatabase'
import { deleteUserProfileData } from '../../data/user-profile-store'
import { PlannerSavePreset } from './PlannerSavePreset'

async function resetDatabase(): Promise<void> {
  await deleteUserProfileData().catch(() => {})
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)
    request.onerror = () => reject(request.error ?? new Error('delete failed'))
    request.onblocked = () => resolve()
    request.onsuccess = () => resolve()
  })
}

function renderSavePreset() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/planner']}>
        <PlannerSavePreset
          result={{
            objectiveValue: '4.08e167',
            carryHeroId: '1',
            placements: { s1: '1', s2: '5' },
            explanations: [{ zh: '当前结果优先保证基线输出。', en: 'This result prioritizes the baseline output.' }],
            warnings: [],
            breakdown: null,
          }}
          layoutId="layout-grand-hero"
          scenarioRef={{ kind: 'adventure', id: '10' }}
        />
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

describe('save planner result as preset', () => {
  it('点击保存会写入 formation preset', async () => {
    const user = userEvent.setup()

    renderSavePreset()

    await user.click(screen.getByRole('button', { name: /保存/i }))

    await waitFor(() => expect(screen.getByText(/已保存/i)).toBeInTheDocument())
    await expect(listFormationPresets()).resolves.toHaveLength(1)
  })

  it('保存的 preset 保留 layoutId、placements 和 scenarioRef', async () => {
    const user = userEvent.setup()

    renderSavePreset()

    await user.click(screen.getByRole('button', { name: /保存/i }))

    await waitFor(() => expect(screen.getByText(/已保存/i)).toBeInTheDocument())

    const presets = await listFormationPresets()
    expect(presets[0]).toMatchObject({
      layoutId: 'layout-grand-hero',
      placements: { s1: '1', s2: '5' },
      scenarioRef: { kind: 'adventure', id: '10' },
    })
  })

  it('结果无效时保存禁用状态可见', () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/planner']}>
          <PlannerSavePreset
            result={null}
            layoutId="layout-1"
            scenarioRef={null}
          />
        </MemoryRouter>
      </I18nProvider>,
    )

    const saveButton = screen.getByRole('button', { name: /保存/i })
    expect(saveButton).toBeDisabled()
  })
})
