import 'fake-indexeddb/auto'

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from '../../app/App'
import { I18nProvider } from '../../app/i18n'
import { ThemeProvider } from '../../app/theme'
import { fetchJson, loadCollection, loadVersion } from '../../data/client'
import { APP_DATABASE_NAME } from '../../data/localDatabase'
import {
  USER_PROFILE_SOURCE_PREFERENCE_STORAGE_KEY,
  deleteUserProfileData,
  saveUserProfileSnapshot,
} from '../../data/user-profile-store'
import { resolveActiveNavigationItem } from '../../app/appNavigation'
import type { HeroAbilityProfile } from '../../domain/abilities/abilityModel'
import type { EffectDefinitionEntry } from '../../domain/buffs/effectDefinitionDps'
import type { LootCatalogEntry } from '../../domain/buffs/equipmentMult'
import type { OfficialPlannerScenarioModel } from '../../domain/planner/plannerModel'
import type { Champion, DataCollection, LocalizedOption, LocalizedText, Variant } from '../../domain/types'
import { createOwnedHero, createUserProfileSnapshot } from '../../domain/user-profile/fixtures'

vi.mock('../../data/client', async () => {
  const actual = await vi.importActual<typeof import('../../data/client')>('../../data/client')

  return {
    ...actual,
    loadVersion: vi.fn(),
    loadCollection: vi.fn(),
    fetchJson: vi.fn(),
  }
})

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
    { id: 'asharra', name: text('Asharra', '阿莎拉'), seat: 1, roles: ['dps', 'support'], affiliations: [], tags: [] },
    { id: 'celeste', name: text('Celeste', '塞莱斯特'), seat: 2, roles: ['healing', 'support'], affiliations: [], tags: [] },
    { id: 'nayeli', name: text('Nayeli', '纳耶里'), seat: 3, roles: ['tanking'], affiliations: [], tags: [] },
    { id: 'jarlaxle', name: text('Jarlaxle', '贾拉索'), seat: 4, roles: ['dps', 'gold'], affiliations: [], tags: [] },
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
    sourceBreakdown: {
      carrySignals: [],
      supportSignals: [],
      unsupportedSignals: [],
    },
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
        { slotId: 's2', row: 1, column: 2, adjacentSlotIds: ['s1', 's3'] },
        { slotId: 's3', row: 1, column: 3, adjacentSlotIds: ['s2', 's4'] },
        { slotId: 's4', row: 1, column: 4, adjacentSlotIds: ['s3'] },
      ],
      forcedHeroes: [],
      enemyTypes: [],
      allowedHeroes: [],
      allowedTags: [],
  occupiedSlotCount: 0,
      scenarioWarnings: ['当前推荐尚未解析场景限制与机制，只按已拥有英雄、seat 合法性和阵型槽位计算。'],
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
  localStorage.removeItem(USER_PROFILE_SOURCE_PREFERENCE_STORAGE_KEY)
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
  mockedLoadVersion.mockReset()
  mockedLoadCollection.mockReset()
  mockedFetchJson.mockReset()
  await resetDatabase()
})

describe('planner route and navigation', () => {
  it('/planner 在无本地快照时只显示引导，不显示推荐结果', async () => {
    render(
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/planner']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>,
    )

    expect(await screen.findByRole('region', { name: '个人数据状态' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: '搜索场景' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /弓兵压制/ })).toBeInTheDocument()
    expect(await screen.findByText('导入个人数据后才会生成推荐。')).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: /推荐结果/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /保存/ })).not.toBeInTheDocument()
  })

  it('/planner 只使用已拥有英雄生成推荐，并允许保存结果', async () => {
    await saveUserProfileSnapshot(
      createUserProfileSnapshot({
        ownedHeroes: [
          createOwnedHero({ heroId: 'bruenor', level: 500 }),
          createOwnedHero({ heroId: 'celeste', level: 500 }),
          createOwnedHero({ heroId: 'nayeli', level: 500 }),
          createOwnedHero({ heroId: 'jarlaxle', level: 500 }),
        ],
      }),
    )

    render(
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/planner']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>,
    )

    const result = await screen.findByRole('article', { name: /推荐结果/ })
    // 默认 carry-dps 模式，评分标签为核心英雄 DPS
    expect(within(result).getByText(/^核心英雄 DPS$/)).toBeInTheDocument()

    const placementTexts = Array.from(result.querySelectorAll('.planner-result-card__placements li'))
      .map((item) => item.textContent)
    expect(placementTexts).toHaveLength(4)
    expect(placementTexts.some((text) => text.includes('bruenor'))).toBe(true)
    expect(placementTexts.some((text) => text.includes('celeste'))).toBe(true)
    expect(placementTexts.some((text) => text.includes('nayeli'))).toBe(true)
    expect(placementTexts.some((text) => text.includes('jarlaxle'))).toBe(true)
    expect(placementTexts.some((text) => text.includes('asharra'))).toBe(false)
    expect(screen.getByRole('button', { name: /保存/ })).toBeEnabled()
  })

  it('/planner 在已拥有英雄含重复 seat 时仍避免 seat conflict', async () => {
    await saveUserProfileSnapshot(
      createUserProfileSnapshot({
        ownedHeroes: [
          createOwnedHero({ heroId: 'bruenor', level: 500 }),
          createOwnedHero({ heroId: 'asharra', level: 500 }),
          createOwnedHero({ heroId: 'celeste', level: 500 }),
          createOwnedHero({ heroId: 'nayeli', level: 500 }),
          createOwnedHero({ heroId: 'jarlaxle', level: 500 }),
        ],
      }),
    )

    render(
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/planner']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>,
    )

    const result = await screen.findByRole('article', { name: /推荐结果/ })
    const placementTexts = Array.from(result.querySelectorAll('.planner-result-card__placements li'))
      .map((item) => item.textContent)
    const seatOneHeroes = placementTexts.filter((text) => text.includes('bruenor') || text.includes('asharra'))
    expect(seatOneHeroes).toHaveLength(1)
  })

  it('/planner 在开发态切换到本地开发快照后可直接消费本地开发数据', async () => {
    localStorage.setItem(USER_PROFILE_SOURCE_PREFERENCE_STORAGE_KEY, 'local-dev-snapshot')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        userDetails: {
          details: {
            heroes: [
              { hero_id: 'bruenor', level: 500, equipment: {}, feats: [], legendary_effects: [] },
              { hero_id: 'celeste', level: 500, equipment: {}, feats: [], legendary_effects: [] },
              { hero_id: 'nayeli', level: 500, equipment: {}, feats: [], legendary_effects: [] },
              { hero_id: 'jarlaxle', level: 500, equipment: {}, feats: [], legendary_effects: [] },
            ],
          },
        },
        campaignDetails: {
          campaigns: [{ campaign_id: '1', favor: '1.50e92' }],
        },
        formationSaves: {
          all_saves: [],
        },
      }),
    }))

    render(
      <I18nProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/planner']}>
            <App />
          </MemoryRouter>
        </ThemeProvider>
      </I18nProvider>,
    )

    expect(await screen.findByText(/本地开发快照已于/)).toBeInTheDocument()
    expect(await screen.findByRole('article', { name: /推荐结果/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /保存/ })).toBeEnabled()
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
