import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/champions/7']}>
        <Routes>
          <Route path="/champions/:championId" element={<ChampionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  )
}

afterEach(() => {
  mockedLoadChampionDetail.mockReset()
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
})
