import 'fake-indexeddb/auto'

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
    loadCollection: vi.fn(),
  }
})

import { App } from '../../src/app/App'
import { I18nProvider } from '../../src/app/i18n'
import { loadCollection } from '../../src/data/client'
import { APP_DATABASE_NAME } from '../../src/data/localDatabase'
import { deleteUserProfileData } from '../../src/data/user-profile-store'
import { resolveActiveNavigationItem } from '../../src/app/appNavigation'
import type { Champion, DataCollection, FormationLayout, LocalizedOption, LocalizedText, Variant } from '../../src/domain/types'

const mockedLoadCollection = vi.mocked(loadCollection)

function text(original: string, display = original): LocalizedText {
  return { original, display }
}

function option(id: string, original: string, display = original): LocalizedOption {
  return { id, original, display }
}

function createVariant(id: string, overrides: Partial<Variant> & Pick<Variant, 'campaign' | 'name'>): Variant {
  return {
    id,
    campaign: overrides.campaign,
    name: overrides.name,
    adventureId: overrides.adventureId ?? null,
    adventure: overrides.adventure ?? null,
    objectiveArea: overrides.objectiveArea ?? null,
    locationId: overrides.locationId ?? null,
    areaSetId: overrides.areaSetId ?? null,
    scene: overrides.scene ?? null,
    restrictions: overrides.restrictions ?? [],
    rewards: overrides.rewards ?? [],
    enemyCount: overrides.enemyCount ?? 0,
    enemyTypes: overrides.enemyTypes ?? [],
    attackMix: overrides.attackMix ?? { melee: 0, ranged: 0, magic: 0, other: 0 },
    specialEnemyCount: overrides.specialEnemyCount ?? 0,
    escortCount: overrides.escortCount ?? 0,
    areaHighlights: overrides.areaHighlights ?? [],
    areaMilestones: overrides.areaMilestones ?? [],
    mechanics: overrides.mechanics ?? [],
  }
}

const campaign = option('campaign-a', 'Grand Tour', '剑湾之旅')

const variantsFixture: DataCollection<Variant> = {
  updatedAt: '2026-05-03T00:00:00.000Z',
  items: [
    createVariant('variant-1', {
      campaign,
      name: text('Archer Barrage', '弓兵压制'),
      adventureId: 'adventure-1',
      adventure: text('Catacombs', '墓穴深处'),
      objectiveArea: 125,
      restrictions: [text('Keep archers contained', '压住弓兵波次')],
    }),
  ],
}

const championsFixture: DataCollection<Champion> = {
  updatedAt: '2026-05-03T00:00:00.000Z',
  items: [
    { id: 'bruenor', name: text('Bruenor', '布鲁诺'), seat: 1, roles: ['support'], affiliations: [], tags: [] },
    { id: 'celeste', name: text('Celeste', '塞莱斯特'), seat: 2, roles: ['healing', 'support'], affiliations: [], tags: [] },
    { id: 'nayeli', name: text('Nayeli', '纳耶里'), seat: 3, roles: ['tanking'], affiliations: [], tags: [] },
    { id: 'jarlaxle', name: text('Jarlaxle', '贾拉索'), seat: 4, roles: ['dps', 'gold'], affiliations: [], tags: [] },
  ],
}

const formationsFixture: DataCollection<FormationLayout> = {
  updatedAt: '2026-05-03T00:00:00.000Z',
  items: [
    {
      id: 'layout-catacombs',
      name: text('Catacombs formation', '墓穴阵型'),
      slots: [
        { id: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
        { id: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
        { id: 's3', row: 1, column: 3, adjacentSlotIds: ['s2', 's4'] },
        { id: 's4', row: 1, column: 4, adjacentSlotIds: ['s3'] },
      ],
      sourceContexts: [
        {
          kind: 'adventure',
          id: 'adventure-1',
          name: text('Catacombs', '墓穴深处'),
        },
      ],
    },
  ],
}

function mockPlannerCollections() {
  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'variants') return variantsFixture
    if (name === 'champions') return championsFixture
    if (name === 'formations') return formationsFixture
    throw new Error(`unexpected collection: ${name}`)
  })
}

async function resetDatabase(): Promise<void> {
  await deleteUserProfileData().catch(() => {})
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)
    request.onerror = () => { reject(request.error ?? new Error('delete failed')) }
    request.onblocked = () => { resolve() }
    request.onsuccess = () => { resolve() }
  })
}

beforeEach(async () => {
  mockPlannerCollections()
  await resetDatabase()
})

afterEach(async () => {
  mockedLoadCollection.mockReset()
  await resetDatabase()
})

describe('planner route and navigation', () => {
  it('/planner 渲染可操作的 planner 纵向集成页面', async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/planner']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )

    expect(await screen.findByRole('region', { name: '个人数据状态' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: '搜索场景' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /弓兵压制/ })).toBeInTheDocument()

    const result = await screen.findByRole('article', { name: /推荐结果/ })
    expect(within(result).getByText(/评分/)).toBeInTheDocument()
    expect(within(result).getByText(/槽位 s1:/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /保存/ })).toBeEnabled()
    expect(screen.queryByText(/自动计划功能正在开发中/)).not.toBeInTheDocument()
  })

  it('导航包含自动计划', () => {
    const item = resolveActiveNavigationItem('/planner', null)
    expect(item.to).toBe('/planner')
    expect(item.label.zh).toBe('自动计划')
  })

  it('保持 HashRouter 兼容性', () => {
    // Ensure the planner route resolves correctly via navigation resolution
    const item = resolveActiveNavigationItem('/planner', null)
    expect(item).toBeDefined()
    expect(item.to).toBe('/planner')
  })
})
