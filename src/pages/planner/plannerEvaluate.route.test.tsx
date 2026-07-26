import 'fake-indexeddb/auto'

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../data/client', async () => {
  const actual = await vi.importActual<typeof import('../../data/client')>('../../data/client')

  return {
    ...actual,
    loadCollection: vi.fn(),
  }
})

import { App } from '../../app/App'
import { I18nProvider } from '../../app/i18n'
import { loadCollection } from '../../data/client'
import { APP_DATABASE_NAME } from '../../data/localDatabase'
import { deleteUserProfileData } from '../../data/user-profile-store'
import type { HeroAbilityProfile } from '../../domain/abilities/abilityModel'
import type { OfficialPlannerScenarioModel } from '../../domain/planner/plannerModel'
import type { Champion, DataCollection, LocalizedOption, LocalizedText, Variant } from '../../domain/types'

const mockedLoadCollection = vi.mocked(loadCollection)

function text(original: string, display = original): LocalizedText {
  return { original, display }
}

function option(id: string, original: string, display = original): LocalizedOption {
  return { id, original, display }
}

const campaign = option('campaign-a', 'Grand Tour', '剑湾之旅')

const variantsFixture: DataCollection<Variant> = {
  updatedAt: '2026-05-03T00:00:00.000Z',
  items: [
    {
      id: 'variant-1',
      campaign,
      name: text('Archer Barrage', '弓兵压制'),
      adventureId: 'adventure-1',
      adventure: text('Catacombs', '墓穴深处'),
      objectiveArea: 125,
      restrictions: [],
      rewards: [],
      enemyCount: 0,
      enemyTypes: [],
      attackMix: { melee: 0, ranged: 0, magic: 0, other: 0 },
      specialEnemyCount: 0,
      escortCount: 0,
      areaHighlights: [],
      areaMilestones: [],
      mechanics: [],
      forcedHeroIds: [],
      allowedHeroIds: [],
      allowedTags: [],
    },
  ],
}

const championsFixture: DataCollection<Champion> = {
  updatedAt: '2026-05-03T00:00:00.000Z',
  items: [
    { id: 'bruenor', name: text('Bruenor', '布鲁诺'), seat: 1, roles: ['support'], affiliations: [], tags: [] },
    { id: 'celeste', name: text('Celeste', '塞莱斯特'), seat: 2, roles: ['healing'], affiliations: [], tags: [] },
  ],
}

const plannerHeroesFixture: DataCollection<HeroAbilityProfile> = {
  updatedAt: '2026-05-03T00:00:00.000Z',
  items: championsFixture.items.map((champion) => ({
    heroId: champion.id,
    name: champion.name,
    seat: champion.seat,
    roles: champion.roles,
    tags: champion.tags,
    baseAttackDamageTypes: [],
    baseAttackCooldown: null,
    age: null,
    abilityScores: {},
    baseDamage: 1,
    baseHealth: 1,
    carrySignals: [],
    supportSignals: [],
    unsupportedSignals: [],
    sourceBreakdown: { carrySignals: [], supportSignals: [], unsupportedSignals: [] },
  })),
}

const plannerScenariosFixture: DataCollection<OfficialPlannerScenarioModel> = {
  updatedAt: '2026-05-03T00:00:00.000Z',
  items: [
    {
      variantId: 'variant-1',
      scenarioRef: { kind: 'variant', id: 'variant-1' },
      name: text('Archer Barrage', '弓兵压制'),
      formationLayoutId: 'layout-catacombs',
      objectiveArea: 125,
      slotTopology: [
        { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
        { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1'] },
      ],
      forcedHeroes: [],
      bannedHeroes: [],
      lockedSlots: [],
      enemyTypes: [],
      allowedHeroes: [],
      allowedTags: [],
      occupiedSlotCount: 0,
      scenarioWarnings: [],
    },
  ],
}

const plannerSemanticOverridesFixture: DataCollection<{ heroId: string }> = {
  updatedAt: '2026-05-03T00:00:00.000Z',
  items: [],
}

function mockPlannerCollections() {
  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'variants') return variantsFixture
    if (name === 'champions') return championsFixture
    if (name === 'hero-abilities') return plannerHeroesFixture
    if (name === 'scenarios') return plannerScenariosFixture
    if (name === 'semantic-overrides') return plannerSemanticOverridesFixture
    throw new Error(`unexpected collection: ${name}`)
  })
}

async function resetDatabase(): Promise<void> {
  await deleteUserProfileData().catch(() => {})
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(APP_DATABASE_NAME)
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
    request.onsuccess = () => resolve()
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

describe('planner evaluate route', () => {
  it('/planner/evaluate 渲染自配评估面板骨架', async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/planner/evaluate']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )

    expect(await screen.findByRole('heading', { name: '自配评估面板' })).toBeInTheDocument()
    expect(await screen.findByText(/已加载 1 个场景/)).toBeInTheDocument()
  })

  it('toolbar 含返回自动计划按钮', async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/planner/evaluate']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )

    expect(await screen.findByRole('button', { name: '返回自动计划' })).toBeInTheDocument()
  })
})
