import 'fake-indexeddb/auto'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../data/client', async () => {
  const actual = await vi.importActual<typeof import('../../data/client')>('../../data/client')

  return {
    ...actual,
    loadVersion: vi.fn(),
    loadCollection: vi.fn(),
    fetchJson: vi.fn(),
  }
})

import { App } from '../../app/App'
import { I18nProvider } from '../../app/i18n'
import { ThemeProvider } from '../../app/theme'
import { fetchJson, loadCollection, loadVersion } from '../../data/client'
import { APP_DATABASE_NAME } from '../../data/localDatabase'
import { deleteUserProfileData } from '../../data/user-profile-store'
import type { HeroAbilityProfile } from '../../domain/abilities/abilityModel'
import type { EffectDefinitionEntry } from '../../domain/buffs/effectDefinitionDps'
import type { LootCatalogEntry } from '../../domain/buffs/equipmentMult'
import type { OfficialPlannerScenarioModel } from '../../domain/planner/plannerModel'
import type { Champion, DataCollection, LocalizedOption, LocalizedText, Variant } from '../../domain/types'

const mockedLoadCollection = vi.mocked(loadCollection)
const mockedLoadVersion = vi.mocked(loadVersion)
const mockedFetchJson = vi.mocked(fetchJson)

const dataVersionFixture = { current: 'test-version', updatedAt: '2026-05-03T00:00:00.000Z', notes: [] }
const lootCatalogFixture: DataCollection<LootCatalogEntry> = { updatedAt: '2026-05-03T00:00:00.000Z', items: [] }
const effectDefinitionsFixture: DataCollection<EffectDefinitionEntry> = { updatedAt: '2026-05-03T00:00:00.000Z', items: [] }

function text(original: string, display = original): LocalizedText {
  return { original, display }
}

function option(id: string, original: string, display = original): LocalizedOption {
  return { id, original, display }
}

const campaign = option('campaign-a', 'Grand Tour', '剑湾之旅')

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
    forcedHeroIds: overrides.forcedHeroIds ?? [],
    allowedHeroIds: overrides.allowedHeroIds ?? [],
    allowedTags: overrides.allowedTags ?? [],
  }
}

const variantsFixture: DataCollection<Variant> = {
  updatedAt: '2026-05-03T00:00:00.000Z',
  items: [
    createVariant('variant-1', {
      campaign,
      name: text('Archer Barrage', '弓兵压制'),
      adventureId: 'adventure-1',
      adventure: text('Catacombs', '墓穴深处'),
      objectiveArea: 125,
    }),
    createVariant('variant-2', {
      campaign,
      name: text('Goblin Rush', '哥布林冲锋'),
      adventureId: 'adventure-2',
      adventure: text('Forest', '森林'),
      objectiveArea: 100,
    }),
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
      enemyTypes: [],
      allowedHeroes: [],
      allowedTags: [],
      occupiedSlotCount: 0,
      scenarioWarnings: [],
    },
    {
      variantId: 'variant-2',
      scenarioRef: { kind: 'variant', id: 'variant-2' },
      name: text('Goblin Rush', '哥布林冲锋'),
      formationLayoutId: 'layout-forest',
      objectiveArea: 100,
      slotTopology: [
        { slotId: 's1', row: 1, column: 1, adjacentSlotIds: ['s2'] },
        { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1'] },
      ],
      forcedHeroes: [],
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
  mockedLoadVersion.mockResolvedValue(dataVersionFixture)
  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'variants') return variantsFixture
    if (name === 'champions') return championsFixture
    if (name === 'hero-abilities') return plannerHeroesFixture
    if (name === 'scenarios') return plannerScenariosFixture
    if (name === 'semantic-overrides') return plannerSemanticOverridesFixture
    if (name === 'loot-catalog') return lootCatalogFixture
    if (name === 'effect-definitions') return effectDefinitionsFixture
    throw new Error(`unexpected collection: ${name}`)
  })
  mockedFetchJson.mockImplementation(async (path: string) => {
    if (path.endsWith('patron-perks.json')) return { perks: [] }
    if (path.endsWith('feat-catalog.json')) return { catalog: {} }
    if (path.endsWith('specialization-catalog.json')) return { catalog: {} }
    throw new Error(`unexpected fetch: ${path}`)
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
  mockedLoadVersion.mockReset()
  mockedLoadCollection.mockReset()
  mockedFetchJson.mockReset()
  await resetDatabase()
})

describe('planner evaluate route', () => {
  it('/planner/evaluate 渲染场景选择与候选范围', async () => {
    render(
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/planner/evaluate']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>,
    )

    expect(await screen.findByRole('searchbox', { name: '搜索场景' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /全部英雄/ })).toBeInTheDocument()
  })

  it('切到全部英雄后，槽位选择英雄更新棋盘', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/planner/evaluate']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
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
        <ThemeProvider>
          <MemoryRouter initialEntries={['/planner/evaluate']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
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
        <ThemeProvider>
          <MemoryRouter initialEntries={['/planner/evaluate']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>,
    )

    await screen.findByRole('searchbox', { name: '搜索场景' })
    await user.click(screen.getByRole('radio', { name: /全部英雄/ }))

    const s1Select = await screen.findByRole('combobox', { name: /槽位 s1 英雄选择/ })
    await user.selectOptions(s1Select, 'bruenor')

    const lockBtn = screen.getByTestId('planner-evaluate-lock-s1')
    await user.click(lockBtn)
    expect(lockBtn).toHaveAttribute('aria-pressed', 'true')

    const fillBtn = await screen.findByTestId('planner-evaluate-fill-remaining')
    await waitFor(() => expect(fillBtn).not.toBeDisabled())
    await user.click(fillBtn)

    const board = screen.getByTestId('planner-evaluate-board')
    await waitFor(() => {
      const s2 = board.querySelector('[data-slot-id="s2"]')
      expect(s2?.getAttribute('data-hero-id')).toBeTruthy()
    })
  })

  it('带 initialVariantId 进入时默认选中该场景（跨页场景同步）', async () => {
    render(
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter
            initialEntries={[{ pathname: '/planner/evaluate', state: { initialVariantId: 'variant-2' } }]}
          >
            <App />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>,
    )

    await screen.findByRole('searchbox', { name: '搜索场景' })
    expect(screen.getByRole('option', { name: /哥布林冲锋/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('toolbar 含返回自动计划按钮', async () => {
    render(
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/planner/evaluate']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>,
    )

    expect(await screen.findByRole('button', { name: '返回自动计划' })).toBeInTheDocument()
  })

  it('锁定槽位后该槽位选择器禁用', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/planner/evaluate']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>,
    )

    await screen.findByRole('searchbox', { name: '搜索场景' })
    await user.click(screen.getByRole('radio', { name: /全部英雄/ }))

    const s1Select = await screen.findByRole('combobox', { name: /槽位 s1 英雄选择/ })
    await user.selectOptions(s1Select, 'bruenor')

    await user.click(screen.getByTestId('planner-evaluate-lock-s1'))
    expect(s1Select).toBeDisabled()
  })

  it('切换场景清空已摆放阵型与锁', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/planner/evaluate']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>,
    )

    await screen.findByRole('searchbox', { name: '搜索场景' })
    await user.click(screen.getByRole('radio', { name: /全部英雄/ }))

    const s1Select = await screen.findByRole('combobox', { name: /槽位 s1 英雄选择/ })
    await user.selectOptions(s1Select, 'bruenor')

    await user.click(screen.getByRole('button', { name: /哥布林冲锋/ }))

    const board = screen.getByTestId('planner-evaluate-board')
    await waitFor(() => {
      const s1 = board.querySelector('[data-slot-id="s1"]')
      expect(s1?.getAttribute('data-hero-id')).toBeFalsy()
    })
    // 切场景清了锁 → 算剩余按钮禁用（无锁不可用）
    expect(screen.getByTestId('planner-evaluate-fill-remaining')).toBeDisabled()
  })
})
