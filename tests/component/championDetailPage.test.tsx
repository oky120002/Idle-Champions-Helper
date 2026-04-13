import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
    loadChampionDetail: vi.fn(),
  }
})

import { I18nProvider } from '../../src/app/i18n'
import { loadChampionDetail } from '../../src/data/client'
import { ChampionDetailPage } from '../../src/pages/ChampionDetailPage'
import type { ChampionDetail } from '../../src/domain/types'

const mockedLoadChampionDetail = vi.mocked(loadChampionDetail)
const originalScrollIntoView = Element.prototype.scrollIntoView

const sectionTopMap: Record<string, number> = {
  overview: 84,
  'character-sheet': 460,
  combat: 860,
  upgrades: 1260,
  feats: 1660,
  skins: 2060,
  raw: 2460,
}

function createDomRect(top: number): DOMRect {
  return {
    x: 0,
    y: top,
    width: 0,
    height: 0,
    top,
    right: 0,
    bottom: top,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect
}

const detailFixture: ChampionDetail = {
  updatedAt: '2026-04-13',
  summary: {
    id: '7',
    name: {
      original: 'Minsc',
      display: '明斯克',
    },
    seat: 7,
    roles: ['support', 'dps'],
    affiliations: [
      {
        original: 'Heroes of Baldur\'s Gate',
        display: '博德之门英雄',
      },
    ],
    tags: ['human', 'support', 'event'],
    portrait: {
      path: 'v1/champion-portraits/7.png',
      sourceGraphic: 'Portraits/Portrait_Minsc',
      sourceVersion: 7,
    },
  },
  englishName: 'Minsc',
  eventName: null,
  dateAvailable: '2017-09-07 00:00:00',
  lastReworkDate: '2017-09-07 00:00:00',
  popularity: 0,
  baseCost: '2500000000',
  baseDamage: '10000000',
  baseHealth: '47',
  graphicId: '8',
  portraitGraphicId: '19',
  availability: {
    availableInNextEvent: false,
    availableInShop: true,
    availableInTimeGate: false,
    isAvailable: true,
    nextEventTimestamp: 0,
  },
  adventureIds: [],
  defaultFeatSlotUnlocks: [10, 30, 70, 120],
  costCurves: { 1: '0.96' },
  healthCurves: { 1: '1.01' },
  properties: { weekly_buff: false },
  characterSheet: {
    fullName: {
      original: 'Minsc',
      display: '明斯克',
    },
    class: {
      original: 'Ranger',
      display: '巡林客',
    },
    race: {
      original: 'Human',
      display: '人类',
    },
    age: 45,
    alignment: {
      original: 'Chaotic Good',
      display: '混乱善良',
    },
    abilityScores: {
      str: 18,
      dex: 12,
      con: 17,
      int: 10,
      wis: 10,
      cha: 10,
    },
    backstory: {
      original: 'Minsc is a dim-witted but courageous ranger.',
      display: '明斯克是一位有些迟钝但非常勇敢的巡林客。',
    },
  },
  attacks: {
    base: {
      id: '13',
      name: {
        original: 'Cleave',
        display: '顺势斩',
      },
      description: {
        original: 'Minsc cleaves all targets near the closest enemy.',
        display: '明斯克顺劈距离最近的敌人附近的所有目标。',
      },
      longDescription: null,
      cooldown: 4.5,
      numTargets: 1,
      aoeRadius: 25,
      damageModifier: '1',
      target: 'closest',
      damageTypes: ['melee'],
      tags: ['cleave'],
      graphicId: '101',
      animations: [],
    },
    ultimate: {
      id: '14',
      name: {
        original: 'Go for the Eyes!',
        display: '直取双眼！',
      },
      description: {
        original: 'Minsc and Boo attack together.',
        display: '明斯克和布布同时发动攻击。',
      },
      longDescription: {
        original: 'Boo leaps and causes additional damage.',
        display: '布布跃起并造成额外伤害。',
      },
      cooldown: 180,
      numTargets: 1,
      aoeRadius: 100,
      damageModifier: '5',
      target: 'front-most',
      damageTypes: ['ultimate'],
      tags: ['ultimate'],
      graphicId: '102',
      animations: [],
    },
    eventUpgrades: [
      {
        upgradeId: '2191',
        name: {
          original: 'Boastful',
          display: '直吹自擂',
        },
        description: null,
        graphicId: '5226',
      },
    ],
  },
  upgrades: [
    {
      id: '108',
      requiredLevel: 50,
      requiredUpgradeId: null,
      name: {
        original: 'Favored Enemy: Humanoids',
        display: '偏好敌人：类人生物',
      },
      upgradeType: 'unlock_ability',
      effectReference: 'effect_def,1326',
      effectDefinition: {
        id: '1326',
        snapshots: {
          original: {
            description: {
              desc: 'Humanoid enemies become Minsc\'s favored enemy.',
            },
          },
          display: {
            description: {
              desc: '类人生物敌人成为明斯克的偏好对手。',
            },
          },
        },
      },
      staticDpsMult: '25',
      defaultEnabled: true,
      specializationName: null,
      specializationDescription: null,
      specializationGraphicId: null,
      tipText: null,
    },
    {
      id: '107',
      requiredLevel: 20,
      requiredUpgradeId: null,
      name: null,
      upgradeType: null,
      effectReference: 'hero_dps_multiplier_mult,100',
      effectDefinition: null,
      staticDpsMult: '100',
      defaultEnabled: true,
      specializationName: null,
      specializationDescription: null,
      specializationGraphicId: null,
      tipText: null,
    },
  ],
  feats: [
    {
      id: '35',
      order: 1,
      name: {
        original: 'Tavern Brawler',
        display: '旅店打手',
      },
      description: {
        original: 'What\'s that, Boo?',
        display: '布布，那是什么东西？',
      },
      rarity: '2',
      graphicId: '6078',
      effects: [{ effect_string: 'hero_dps_multiplier_mult,30' }],
      sources: [{ source: 'default' }],
      properties: { is_available: true },
      collectionsSource: { type: 'free' },
    },
  ],
  skins: [
    {
      id: '4',
      name: {
        original: 'Giant Boo Costume',
        display: '巨型布布服装',
      },
      cost: [],
      details: { portrait_graphic_id: 4473 },
      rarity: '3',
      properties: { is_available: true },
      collectionsSource: { type: 'flash_sale' },
      availabilities: { in_flash_sales: true },
    },
  ],
  raw: {
    hero: {
      original: { id: 7, seat_id: 7 },
      display: { id: 7, seat_id: 7 },
    },
    attacks: [
      {
        id: '13',
        snapshots: {
          original: { id: 13 },
          display: { id: 13 },
        },
      },
    ],
    upgrades: [
      {
        id: '108',
        snapshots: {
          original: { id: 108 },
          display: { id: 108 },
        },
      },
    ],
    feats: [
      {
        id: '35',
        snapshots: {
          original: { id: 35 },
          display: { id: 35 },
        },
      },
    ],
    skins: [
      {
        id: '4',
        snapshots: {
          original: { id: 4 },
          display: { id: 4 },
        },
      },
    ],
  },
}

function renderChampionDetailPage() {
  return renderChampionDetailPageAt('/champions/7')
}

function LocationProbe() {
  const location = useLocation()

  return <output data-testid="router-location">{`${location.pathname}${location.search}${location.hash}`}</output>
}

function renderChampionDetailPageAt(initialEntry: string) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/champions/:championId"
            element={
              <>
                <ChampionDetailPage />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  )
}

function renderChampionDetailPageWithSearch() {
  return renderChampionDetailPageAt('/champions/7?q=alpha&seat=1&role=support')
}

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  })

  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function mockBoundingClientRect(this: Element) {
    if (this instanceof HTMLElement) {
      return createDomRect(sectionTopMap[this.id] ?? 4000)
    }

    return createDomRect(4000)
  })
})

afterEach(() => {
  mockedLoadChampionDetail.mockReset()
  vi.restoreAllMocks()
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: originalScrollIntoView,
  })
})

describe('ChampionDetailPage', () => {
  it('按分区渲染英雄详情，并保留原始字段入口', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    expect(await screen.findByRole('heading', { level: 2, name: '明斯克' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '叙事资料与能力分布' })).toBeInTheDocument()
    expect(screen.getByText(/明斯克是一位有些迟钝但非常勇敢的巡林客/)).toBeInTheDocument()
    expect(screen.getByText('偏好敌人：类人生物 · Favored Enemy: Humanoids')).toBeInTheDocument()
    expect(screen.getByText('类人生物敌人成为明斯克的偏好对手。')).toBeInTheDocument()
    expect(screen.getByText('Hero / Attacks / Upgrades / Feats / Skins')).toBeInTheDocument()
    expect(screen.getByText('Hero 快照')).toBeInTheDocument()
  })

  it('在 404 时展示未找到状态', async () => {
    mockedLoadChampionDetail.mockRejectedValue(new Error('HTTP 404'))

    renderChampionDetailPage()

    expect(await screen.findByRole('heading', { level: 2, name: '没有找到这个英雄' })).toBeInTheDocument()
  })

  it('返回链接会带回筛选页查询参数', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPageWithSearch()

    expect(await screen.findByRole('link', { name: '← 返回英雄筛选' })).toHaveAttribute(
      'href',
      '/champions?q=alpha&seat=1&role=support',
    )
  })

  it('默认高亮概览分区', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    const overviewButtons = await screen.findAllByRole('button', { name: '概览' })
    const upgradeButtons = await screen.findAllByRole('button', { name: '升级' })

    overviewButtons.forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })
    upgradeButtons.forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed', 'false')
    })
    await waitFor(() => {
      expect(screen.getByTestId('router-location')).toHaveTextContent('/champions/7#overview')
    })
  })

  it('点击分区导航后会同步高亮顶部和侧栏按钮', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    const upgradeButtons = await screen.findAllByRole('button', { name: '升级' })
    fireEvent.click(upgradeButtons[0])

    screen.getAllByRole('button', { name: '升级' }).forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })
    screen.getAllByRole('button', { name: '概览' }).forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed', 'false')
    })
    await waitFor(() => {
      expect(screen.getByTestId('router-location')).toHaveTextContent('/champions/7#upgrades')
    })
  })

  it('带分区 hash 进入时会直达对应分区并保留该 hash', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPageAt('/champions/7#upgrades')

    await waitFor(() => {
      screen.getAllByRole('button', { name: '升级' }).forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed', 'true')
      })
    })
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByTestId('router-location')).toHaveTextContent('/champions/7#upgrades')
    })
  })
})
