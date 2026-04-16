import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
    loadChampionDetail: vi.fn(),
    loadCollection: vi.fn(),
  }
})

import { I18nProvider } from '../../src/app/i18n'
import { loadChampionDetail, loadCollection } from '../../src/data/client'
import { ChampionDetailPage } from '../../src/pages/ChampionDetailPage'
import type { ChampionDetail, ChampionIllustration, DataCollection } from '../../src/domain/types'

const mockedLoadChampionDetail = vi.mocked(loadChampionDetail)
const mockedLoadCollection = vi.mocked(loadCollection)
const originalScrollIntoView = Element.prototype.scrollIntoView

const sectionTopMap: Record<string, number> = {
  overview: 84,
  'character-sheet': 460,
  combat: 860,
  upgrades: 1260,
  feats: 1660,
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
  costCurves: { 1: '0.96', 2: '1.12' },
  healthCurves: { 1: '1.01' },
  properties: {
    available_in_store: '2025-10-23 12:00:00',
    pain_sounds: [190, 191, 192],
    weekly_buff: 'buff_upgrades,200,108,109',
    notification_adjustment: {
      offset: [56, 204],
      scale: 1.25,
    },
  },
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
      staticDpsMult: '1.25',
      defaultEnabled: true,
      specializationName: null,
      specializationDescription: null,
      specializationGraphicId: null,
      tipText: null,
    },
    {
      id: '109',
      requiredLevel: 50,
      requiredUpgradeId: null,
      name: {
        original: 'Favored Enemy: Beasts',
        display: '偏好敌人：兽类',
      },
      upgradeType: 'unlock_ability',
      effectReference: 'effect_def,1327',
      effectDefinition: null,
      staticDpsMult: '1.25',
      defaultEnabled: true,
      specializationName: null,
      specializationDescription: null,
      specializationGraphicId: null,
      tipText: null,
    },
    {
      id: '117',
      requiredLevel: 125,
      requiredUpgradeId: null,
      name: null,
      upgradeType: 'upgrade_ability',
      effectReference:
        `{"effect_string":"buff_upgrades,200,108,109","description":"Increases the effect of Minsc's Favored Enemy ability by $(amount)%."}`,
      effectDefinition: null,
      staticDpsMult: null,
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
    {
      id: '5',
      name: {
        original: 'Space Boo Expedition',
        display: '太空布布远征装',
      },
      cost: {
        soft_currency: 40000,
      },
      details: {
        large_graphic_id: 4475,
        portrait_graphic_id: 4474,
      },
      rarity: '4',
      properties: { is_available: true },
      collectionsSource: { type: 'wild_offer' },
      availabilities: { in_wild_offers: true },
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
      {
        id: '5',
        snapshots: {
          original: { id: 5 },
          display: { id: 5 },
        },
      },
    ],
  },
}

const illustrationFixture: DataCollection<ChampionIllustration> = {
  updatedAt: '2026-04-15',
  items: [
    {
      id: 'skin:4',
      championId: '7',
      skinId: '4',
      kind: 'skin',
      seat: 7,
      championName: {
        original: 'Minsc',
        display: '明斯克',
      },
      illustrationName: {
        original: 'Giant Boo Costume',
        display: '巨型布布服装',
      },
      portraitPath: 'v1/champion-portraits/7.png',
      sourceSlot: 'large',
      sourceGraphicId: '4471',
      sourceGraphic: 'Characters/Hero_Minsc_GiantBoo_2xup',
      sourceVersion: 1,
      image: {
        path: 'v1/champion-illustrations/skins/4.png',
        width: 1024,
        height: 1024,
        bytes: 64000,
        format: 'png',
      },
    },
    {
      id: 'skin:5',
      championId: '7',
      skinId: '5',
      kind: 'skin',
      seat: 7,
      championName: {
        original: 'Minsc',
        display: '明斯克',
      },
      illustrationName: {
        original: 'Space Boo Expedition',
        display: '太空布布远征装',
      },
      portraitPath: 'v1/champion-portraits/7.png',
      sourceSlot: 'base',
      sourceGraphicId: '4472',
      sourceGraphic: 'Characters/Hero_Minsc_SpaceBoo',
      sourceVersion: 1,
      image: {
        path: 'v1/champion-illustrations/skins/5.png',
        width: 1024,
        height: 1024,
        bytes: 65000,
        format: 'png',
      },
    },
  ],
}

function renderChampionDetailPage() {
  return renderChampionDetailPageAt('/champions/7')
}

function renderChampionDetailPageAt(initialEntry: string) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/champions/:championId" element={<ChampionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  )
}

function renderChampionDetailPageWithSearch() {
  return renderChampionDetailPageAt('/champions/7?q=alpha&seat=1&role=support')
}

function renderChampionDetailPageWithBackRoute(initialEntry: string) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/champions" element={<div>筛选页占位</div>} />
          <Route path="/champions/:championId" element={<ChampionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  )
}

beforeEach(() => {
  window.history.replaceState(window.history.state, '', '/')
  Object.assign(sectionTopMap, {
    overview: 84,
    'character-sheet': 460,
    combat: 860,
    upgrades: 1260,
    feats: 1660,
  })

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

  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'champion-illustrations') {
      return illustrationFixture
    }

    throw new Error(`unexpected collection: ${name}`)
  })
})

afterEach(() => {
  mockedLoadChampionDetail.mockReset()
  mockedLoadCollection.mockReset()
  vi.restoreAllMocks()
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: originalScrollIntoView,
  })
})

describe('ChampionDetailPage', () => {
  it('按分区渲染英雄详情，并过滤无意义的详情区块', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    expect(await screen.findByRole('heading', { level: 2, name: '明斯克' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '叙事资料与能力分布' })).toBeInTheDocument()
    expect(screen.getByText(/明斯克是一位有些迟钝但非常勇敢的巡林客/)).toBeInTheDocument()
    expect(screen.getByText('偏好敌人：类人生物')).toBeInTheDocument()
    expect(screen.getByText('Favored Enemy: Humanoids')).toBeInTheDocument()
    expect(screen.getByText('类人生物敌人成为明斯克的偏好对手。')).toBeInTheDocument()
    expect(screen.getByText('商店上架时间')).toBeInTheDocument()
    expect(screen.getByText('周增益')).toBeInTheDocument()
    expect(screen.getAllByText('使偏好敌人（2 个分支）效果提高 200%').length).toBeGreaterThan(0)
    expect(screen.getByText('自身伤害提高 30%')).toBeInTheDocument()
    expect(screen.getByText('获取来源')).toBeInTheDocument()
    expect(screen.queryByText('软货币')).not.toBeInTheDocument()
    expect(screen.queryByText('Large Graphic ID')).not.toBeInTheDocument()
    expect(screen.queryByText('原始字段')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sidebar-section-raw')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sidebar-section-skins')).not.toBeInTheDocument()
    expect(screen.queryByText('large_graphic_id')).not.toBeInTheDocument()
    expect(screen.queryByText('未命名 upgrade_ability')).not.toBeInTheDocument()
    expect(screen.queryByText('Hero 快照')).not.toBeInTheDocument()
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

  it('点击返回链接后不会被分区 hash 同步拉回详情页', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPageWithBackRoute('/champions/7?seat=7')

    expect(await screen.findByRole('link', { name: '← 返回英雄筛选' })).toHaveAttribute('href', '/champions?seat=7')
    fireEvent.click(await screen.findByTestId('sidebar-section-upgrades'))
    expect(await screen.findByText('当前浏览 · 升级')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: '← 返回英雄筛选' }))

    expect(await screen.findByText('筛选页占位')).toBeInTheDocument()
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
    expect(screen.getByTestId('sidebar-section-overview')).toHaveAttribute('data-progress-state', 'active')
    expect(screen.getByTestId('sidebar-section-overview')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByTestId('sidebar-section-combat')).toHaveAttribute('data-progress-state', 'upcoming')
    expect(screen.getByText('当前浏览 · 概览')).toBeInTheDocument()
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
    await waitFor(() => {
      expect(window.location.hash).toBe('#/champions/7#section-overview')
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
    expect(screen.getByTestId('sidebar-section-overview')).toHaveAttribute('data-progress-state', 'completed')
    expect(screen.getByTestId('sidebar-section-upgrades')).toHaveAttribute('data-progress-state', 'active')
    expect(screen.getByTestId('sidebar-section-feats')).toHaveAttribute('data-progress-state', 'upcoming')
    expect(screen.getByText('当前浏览 · 升级')).toBeInTheDocument()
    expect(screen.getByText('4 / 5')).toBeInTheDocument()
    await waitFor(() => {
      expect(window.location.hash).toBe('#/champions/7#section-upgrades')
    })
  })

  it('带分区 hash 进入时会直达对应分区并保留该 hash', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    window.history.replaceState(window.history.state, '', '/#/champions/7#section-upgrades')
    renderChampionDetailPageAt('/champions/7#section-upgrades')

    await waitFor(() => {
      screen.getAllByRole('button', { name: '升级' }).forEach((button) => {
        expect(button).toHaveAttribute('aria-pressed', 'true')
      })
    })
    expect(screen.getByTestId('sidebar-section-upgrades')).toHaveAttribute('data-progress-state', 'active')
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    await waitFor(() => {
      expect(window.location.hash).toBe('#/champions/7#section-upgrades')
    })
  })

  it('滚动激活新的分区时不会再被 hash 定位拉回原处', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    await screen.findByRole('heading', { level: 2, name: '明斯克' })

    Object.assign(sectionTopMap, {
      overview: -360,
      'character-sheet': -280,
      combat: -220,
      upgrades: 120,
      feats: 720,
    })

    fireEvent.scroll(window)

    await waitFor(() => {
      expect(screen.getByText('当前浏览 · 升级')).toBeInTheDocument()
    })

    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(window.location.hash).toBe('#/champions/7#section-upgrades')
    })
  })

  it('支持在悬浮预览里切换不同皮肤', async () => {
    mockedLoadChampionDetail.mockResolvedValue(detailFixture)

    renderChampionDetailPage()

    await screen.findByRole('heading', { level: 2, name: '明斯克' })

    fireEvent.click(screen.getByRole('button', { name: '打开皮肤立绘预览' }))

    expect(screen.getByRole('dialog', { name: '皮肤立绘预览' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('img', { name: '巨型布布服装皮肤预览' })).toHaveAttribute(
        'src',
        '/data/v1/champion-illustrations/skins/4.png',
      )
    })
    await waitFor(() => {
      expect(screen.getByText('已命中')).toBeInTheDocument()
      expect(screen.getByText('large')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '切换皮肤：太空布布远征装' }))

    await waitFor(() => {
      expect(screen.getByRole('img', { name: '太空布布远征装皮肤预览' })).toHaveAttribute(
        'src',
        '/data/v1/champion-illustrations/skins/5.png',
      )
    })
  })
})
