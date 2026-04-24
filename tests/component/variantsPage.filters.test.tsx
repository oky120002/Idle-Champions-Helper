/* eslint-disable max-lines -- Fixture-heavy filter coverage stays together so URL sync, view reset, and share-link regressions read as one scenario set. */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement, Fragment } from 'react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
    loadCollection: vi.fn(),
  }
})

import { I18nProvider } from '../../src/app/i18n'
import { loadCollection } from '../../src/data/client'
import type { DataCollection, FormationLayout, LocalizedOption, LocalizedText, Variant } from '../../src/domain/types'
import { VariantsPage } from '../../src/pages/VariantsPage'
import { MAX_VISIBLE_VARIANTS } from '../../src/pages/variants/constants'

const mockedLoadCollection = vi.mocked(loadCollection)
const writeClipboardText = vi.fn<(_: string) => Promise<void>>()

function installClipboardMock() {
  writeClipboardText.mockReset()
  writeClipboardText.mockResolvedValue(undefined)
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: writeClipboardText,
    },
  })
}

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

const campaignA = option('campaign-a', 'Grand Tour', '剑湾之旅')
const campaignB = option('campaign-b', 'Icewind Dale', '冰风谷')
const sceneFarm = option('scene-farm', 'Cursed Farm', '诅咒农场')
const sceneCatacombs = option('scene-catacombs', 'Moon Catacombs', '月下墓穴')

const variantsFixture: DataCollection<Variant> = {
  updatedAt: '2026-04-23T00:00:00.000Z',
  items: [
    createVariant('1', {
      campaign: campaignA,
      name: text('Archer Barrage', '弓兵压制'),
      adventureId: 'adventure-1',
      adventure: text('Catacombs', '墓穴深处'),
      objectiveArea: 125,
      scene: sceneCatacombs,
      restrictions: [text('Keep archers contained', '压住弓兵波次')],
      rewards: [text('Gold chest', '金宝箱')],
      enemyTypes: ['undead'],
      attackMix: { melee: 1, ranged: 4, magic: 0, other: 0 },
      specialEnemyCount: 11,
      areaMilestones: [50, 125],
      mechanics: ['armorBased'],
    }),
    createVariant('2', {
      campaign: campaignB,
      name: text('Frozen Push', '冰原推进'),
      adventureId: 'adventure-2',
      adventure: text('Frost Gate', '霜门关卡'),
      objectiveArea: 175,
      scene: sceneFarm,
      restrictions: [text('Dragons ahead', '前方有龙类敌人')],
      rewards: [text('Event tokens', '活动代币')],
      enemyTypes: ['dragon'],
      attackMix: { melee: 2, ranged: 1, magic: 2, other: 0 },
      specialEnemyCount: 14,
      areaMilestones: [75, 175],
      mechanics: ['hitsBased'],
    }),
  ],
}

const crowdedVariantsFixture: DataCollection<Variant> = {
  updatedAt: '2026-04-23T00:00:00.000Z',
  items: Array.from({ length: 62 }, (_, index) => {
    const isCampaignA = index < 31
    const campaign = isCampaignA ? campaignA : campaignB
    const sequence = index + 1

    return createVariant(String(sequence), {
      campaign,
      name: text(`Variant ${sequence}`, `变体 ${sequence}`),
      adventureId: `${campaign.id}-adventure-${Math.floor(index / 2)}`,
      adventure: text(`Adventure ${sequence}`, `冒险 ${sequence}`),
      objectiveArea: 75 + index,
      scene: isCampaignA ? sceneFarm : sceneCatacombs,
      restrictions: [text(`Restriction ${sequence}`, `限制 ${sequence}`)],
      enemyTypes: [isCampaignA ? 'undead' : 'dragon'],
      attackMix: { melee: 2, ranged: 1, magic: 0, other: 0 },
      specialEnemyCount: 8 + (index % 6),
      areaMilestones: [75 + index],
      mechanics: [],
    })
  }),
}

const enumsFixture: DataCollection<unknown> = {
  updatedAt: '2026-04-23T00:00:00.000Z',
  items: [
    {
      id: 'campaigns',
      values: [campaignA, campaignB],
    },
  ],
}

const formationsFixture: DataCollection<FormationLayout> = {
  updatedAt: '2026-04-23T00:00:00.000Z',
  items: [
    {
      id: 'formation-a',
      name: text('Formation A', '阵型 A'),
      slots: [{ id: 'slot-a', row: 1, column: 1 }],
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

function mockVariantsPageCollections(overrides: {
  variants?: DataCollection<Variant>
  enums?: DataCollection<unknown>
  formations?: DataCollection<FormationLayout>
} = {}) {
  const {
    variants = variantsFixture,
    enums = enumsFixture,
    formations = formationsFixture,
  } = overrides

  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'variants') {
      return variants
    }

    if (name === 'enums') {
      return enums
    }

    if (name === 'formations') {
      return formations
    }

    throw new Error(`unexpected collection: ${name}`)
  })
}

function renderVariantsPage(initialEntries: string[] = ['/variants']) {
  function VariantsPageRoute() {
    const location = useLocation()

    return createElement(
      Fragment,
      null,
      createElement(VariantsPage),
      createElement('output', { 'data-testid': 'location-search' }, location.search),
    )
  }

  const router = createMemoryRouter(
    [
      {
        path: '/variants',
        element: createElement(VariantsPageRoute),
      },
    ],
    { initialEntries },
  )

  return {
    router,
    ...render(
      createElement(
        I18nProvider,
        null,
        createElement(RouterProvider, { router }),
      ),
    ),
  }
}

describe('VariantsPage filters', () => {
  beforeEach(() => {
    installClipboardMock()
    mockVariantsPageCollections()
  })

  afterEach(() => {
    mockedLoadCollection.mockReset()
    vi.restoreAllMocks()
  })

  it('把筛选状态收进左侧工具栏，并移除右侧重复的命中徽标', async () => {
    const user = userEvent.setup()

    renderVariantsPage()

    expect(await screen.findByLabelText('变体筛选结果')).toBeInTheDocument()
    expect(screen.getByText('条件待命', { selector: '.workbench-page__toolbar-lead-status' })).toBeInTheDocument()
    expect(screen.queryByText('2 命中')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /月下墓穴/ }))

    expect(screen.getByText('1 项条件', { selector: '.workbench-page__toolbar-lead-status' })).toBeInTheDocument()
    expect(screen.queryByText('1 命中')).not.toBeInTheDocument()
  })

  it('会把筛选状态同步进 URL，并在路由变化后回灌 UI', async () => {
    const user = userEvent.setup()
    const { router } = renderVariantsPage()

    await screen.findByLabelText('变体筛选结果')

    await user.type(screen.getByRole('textbox', { name: /^关键词/ }), '弓兵')
    await user.click(screen.getByRole('button', { name: /月下墓穴/ }))

    await waitFor(() => {
      const searchParams = new URLSearchParams(screen.getByTestId('location-search').textContent ?? '')

      expect(searchParams.get('q')).toBe('弓兵')
      expect(searchParams.getAll('scene')).toEqual(['scene-catacombs'])
    })

    await router.navigate('/variants?campaign=campaign-b&scene=scene-farm')

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '战役' })).toHaveValue('campaign-b')
    })

    expect(screen.getByRole('button', { name: /诅咒农场/ })).toHaveClass('filter-chip--active')
    expect(screen.getByRole('button', { name: /月下墓穴/ })).not.toHaveClass('filter-chip--active')
    expect(screen.getByTestId('location-search')).toHaveTextContent('?campaign=campaign-b&scene=scene-farm')
    expect(screen.getByText('冰原推进')).toBeInTheDocument()
    expect(screen.queryByText('弓兵压制')).not.toBeInTheDocument()
  })

  it('默认仅展示首批结果，并在筛选变更后自动收起 view=all', async () => {
    const user = userEvent.setup()
    mockVariantsPageCollections({ variants: crowdedVariantsFixture })

    renderVariantsPage()

    const results = await screen.findByLabelText('变体筛选结果')
    expect(within(results).getAllByRole('heading', { level: 5 })).toHaveLength(MAX_VISIBLE_VARIANTS)

    await user.click(screen.getByRole('button', { name: `显示全部 62（默认 ${MAX_VISIBLE_VARIANTS}）` }))

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('?view=all')
    })

    expect(within(results).getAllByRole('heading', { level: 5 })).toHaveLength(62)

    await user.selectOptions(screen.getByRole('combobox', { name: '战役' }), 'campaign-b')

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('?campaign=campaign-b')
    })

    expect(screen.queryByRole('button', { name: /显示全部/ })).not.toBeInTheDocument()
    expect(within(results).getAllByRole('heading', { level: 5 })).toHaveLength(31)
  })

  it('支持复制当前筛选链接', async () => {
    const user = userEvent.setup()
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText')

    renderVariantsPage()

    await screen.findByLabelText('变体筛选结果')

    await user.type(screen.getByRole('textbox', { name: /^关键词/ }), '弓兵')
    await user.click(screen.getByRole('button', { name: /月下墓穴/ }))

    await waitFor(() => {
      const searchParams = new URLSearchParams(screen.getByTestId('location-search').textContent ?? '')

      expect(searchParams.get('q')).toBe('弓兵')
      expect(searchParams.getAll('scene')).toEqual(['scene-catacombs'])
    })

    await user.click(screen.getByRole('button', { name: '复制当前链接' }))

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledTimes(1)
    })

    const copiedUrl = writeTextSpy.mock.calls[0]?.[0]

    expect(copiedUrl).toContain('#/variants?q=%E5%BC%93%E5%85%B5&scene=scene-catacombs')
    expect(screen.getByRole('button', { name: '已复制链接' })).toBeInTheDocument()
  })
})
