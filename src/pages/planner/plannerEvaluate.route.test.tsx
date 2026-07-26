import 'fake-indexeddb/auto'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  it('/planner/evaluate 渲染场景选择与候选范围', async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/planner/evaluate']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )

    expect(await screen.findByRole('searchbox', { name: '搜索场景' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /全部英雄/ })).toBeInTheDocument()
  })

  it('切到全部英雄后，槽位选择英雄更新棋盘', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/planner/evaluate']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )

    await screen.findByRole('searchbox', { name: '搜索场景' })
    await user.click(screen.getByRole('radio', { name: /全部英雄/ }))

    const select = await screen.findByRole('combobox', { name: /槽位 s1 英雄选择/ })
    await user.selectOptions(select, 'bruenor')

    const board = screen.getByTestId('planner-evaluate-board')
    await waitFor(() => {
      expect(board.querySelector('[data-slot-id="s1"]')).toHaveAttribute('data-hero-id', 'bruenor')
    })
  })

  it('摆英雄后显示核心英雄 DPS', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/planner/evaluate']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )

    await screen.findByRole('searchbox', { name: '搜索场景' })
    await user.click(screen.getByRole('radio', { name: /全部英雄/ }))

    const select = await screen.findByRole('combobox', { name: /槽位 s1 英雄选择/ })
    await user.selectOptions(select, 'bruenor')

    const scoreCard = await screen.findByTestId('planner-evaluate-score')
    expect(scoreCard).toHaveTextContent('核心英雄 DPS')
    const scoreValue = scoreCard.querySelector('strong')
    expect(scoreValue).not.toBeNull()
    expect(scoreValue?.textContent).toBeTruthy()
  })

  it('锁槽位后点算剩余，系统补全剩余槽位', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/planner/evaluate']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )

    await screen.findByRole('searchbox', { name: '搜索场景' })
    await user.click(screen.getByRole('radio', { name: /全部英雄/ }))

    const s1Select = await screen.findByRole('combobox', { name: /槽位 s1 英雄选择/ })
    await user.selectOptions(s1Select, 'bruenor')

    const lockBtn = screen.getByTestId('planner-evaluate-lock-s1')
    await user.click(lockBtn)
    expect(lockBtn).toHaveAttribute('aria-pressed', 'true')

    const fillBtn = screen.getByTestId('planner-evaluate-fill-remaining')
    await user.click(fillBtn)

    const board = screen.getByTestId('planner-evaluate-board')
    await waitFor(() => {
      const s2 = board.querySelector('[data-slot-id="s2"]')
      expect(s2?.getAttribute('data-hero-id')).toBeTruthy()
    })
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
