/* eslint-disable max-lines -- Fixture-heavy state coverage stays in one file so the URL/share/randomize scenarios remain readable together. */
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
import type { DataCollection, Pet, PetAnimation } from '../../src/domain/types'
import { PetsPage } from '../../src/pages/PetsPage'
import { MAX_VISIBLE_PETS } from '../../src/pages/pets/constants'

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

const petsFixture: DataCollection<Pet> = {
  updatedAt: '2026-04-23T00:00:00.000Z',
  items: [
    {
      id: 'pet-clockwork-cat',
      name: { original: 'Clockwork Cat', display: '发条小猫' },
      description: { original: 'A gem-shop companion.', display: '一只宝石商店伙伴。' },
      isAvailable: true,
      iconGraphicId: '101',
      illustrationGraphicId: '201',
      acquisition: {
        kind: 'gems',
        sourceType: 'shop',
        gemCost: 50000,
        premiumPackName: null,
        premiumPackDescription: null,
        patronName: null,
        patronCurrency: null,
        patronCost: null,
        patronInfluence: null,
      },
      icon: { path: 'v1/pets/icons/clockwork-cat.png', width: 128, height: 128, bytes: 1024, format: 'png' },
      illustration: { path: 'v1/pets/illustrations/clockwork-cat.png', width: 512, height: 512, bytes: 4096, format: 'png' },
    },
    {
      id: 'pet-arcane-owl',
      name: { original: 'Arcane Owl', display: '秘法猫头鹰' },
      description: { original: 'A premium familiar.', display: '一只付费熟悉魔宠。' },
      isAvailable: true,
      iconGraphicId: '102',
      illustrationGraphicId: null,
      acquisition: {
        kind: 'premium',
        sourceType: 'dlc',
        gemCost: null,
        premiumPackName: { original: 'Arcane Owl DLC', display: '秘法猫头鹰 DLC' },
        premiumPackDescription: null,
        patronName: null,
        patronCurrency: null,
        patronCost: null,
        patronInfluence: null,
      },
      icon: { path: 'v1/pets/icons/arcane-owl.png', width: 128, height: 128, bytes: 1024, format: 'png' },
      illustration: null,
    },
    {
      id: 'pet-patron-raven',
      name: { original: 'Patron Raven', display: '赞助商乌鸦' },
      description: { original: 'A patron-shop familiar.', display: '一只赞助商商店宠物。' },
      isAvailable: true,
      iconGraphicId: '103',
      illustrationGraphicId: '203',
      acquisition: {
        kind: 'patron',
        sourceType: 'patronShop',
        gemCost: null,
        premiumPackName: null,
        premiumPackDescription: null,
        patronName: { original: 'Mirt', display: '米尔特' },
        patronCurrency: { original: 'Ruby Coin', display: '红宝石币' },
        patronCost: 500,
        patronInfluence: 2500,
      },
      icon: { path: 'v1/pets/icons/patron-raven.png', width: 128, height: 128, bytes: 1024, format: 'png' },
      illustration: { path: 'v1/pets/illustrations/patron-raven.png', width: 512, height: 512, bytes: 4096, format: 'png' },
    },
  ],
}

const petAnimationsFixture: DataCollection<PetAnimation> = {
  updatedAt: '2026-04-23T00:00:00.000Z',
  items: [],
}

function mockPetsPageCollections(overrides: { pets?: DataCollection<Pet>; animations?: DataCollection<PetAnimation> } = {}) {
  const { pets = petsFixture, animations = petAnimationsFixture } = overrides

  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'pets') {
      return pets
    }

    if (name === 'pet-animations') {
      return animations
    }

    throw new Error(`unexpected collection: ${name}`)
  })
}

function renderPetsPage(initialEntries: string[] = ['/pets']) {
  function PetsPageRoute() {
    const location = useLocation()

    return createElement(
      Fragment,
      null,
      createElement(PetsPage),
      createElement('output', { 'data-testid': 'location-search' }, location.search),
    )
  }

  const router = createMemoryRouter(
    [
      {
        path: '/pets',
        element: createElement(PetsPageRoute),
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

function getPetOrder() {
  return within(screen.getByLabelText('宠物筛选结果'))
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent?.trim() ?? '')
}

describe('PetsPage state', () => {
  beforeEach(() => {
    installClipboardMock()
    mockPetsPageCollections()
  })

  afterEach(() => {
    mockedLoadCollection.mockReset()
    vi.restoreAllMocks()
  })

  it('会把筛选状态同步进 URL，并在路由变化后回灌 UI', async () => {
    const user = userEvent.setup()
    const { router } = renderPetsPage()

    await screen.findByLabelText('宠物筛选结果')

    await user.type(screen.getByRole('searchbox', { name: /^搜索/ }), 'owl')
    await user.click(screen.getByRole('button', { name: '付费购买' }))
    await user.click(screen.getByRole('button', { name: '缺图像' }))

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('?q=owl&source=premium&asset=missing')
    })

    await router.navigate('/pets?source=patron&asset=complete')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '赞助商商店' })).toHaveClass('filter-chip--active')
    })

    expect(screen.getByRole('button', { name: '完整图像' })).toHaveClass('segmented-control__button--active')
    expect(screen.getByRole('searchbox', { name: /^搜索/ })).toHaveValue('')
    expect(screen.getByText('赞助商乌鸦')).toBeInTheDocument()
    expect(screen.queryByText('秘法猫头鹰')).not.toBeInTheDocument()
  })

  it('支持复制当前筛选链接', async () => {
    const user = userEvent.setup()
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText')

    renderPetsPage()

    await screen.findByLabelText('宠物筛选结果')
    await user.type(screen.getByRole('searchbox', { name: /^搜索/ }), 'owl')
    await user.click(screen.getByRole('button', { name: '付费购买' }))

    await waitFor(() => {
      const searchParams = new URLSearchParams(screen.getByTestId('location-search').textContent ?? '')

      expect(searchParams.get('q')).toBe('owl')
      expect(searchParams.get('source')).toBe('premium')
    })

    await user.click(screen.getByRole('button', { name: '复制当前链接' }))

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledTimes(1)
    })

    const copiedUrl = writeTextSpy.mock.calls[0]?.[0]

    expect(copiedUrl).toContain('#/pets?q=owl&source=premium')
    expect(screen.getByRole('button', { name: '已复制链接' })).toBeInTheDocument()
  })

  it('支持在当前结果里随机排序宠物卡片', async () => {
    const user = userEvent.setup()

    renderPetsPage()

    const results = await screen.findByLabelText('宠物筛选结果')
    const initialOrder = getPetOrder()

    expect(initialOrder).toEqual(['发条小猫', '秘法猫头鹰', '赞助商乌鸦'])

    await user.click(screen.getByRole('button', { name: '随机排序' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '重新随机' })).toBeInTheDocument()
    })

    const shuffledOrder = within(results)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent?.trim() ?? '')

    expect(shuffledOrder).not.toEqual(initialOrder)
    expect(shuffledOrder.slice().sort()).toEqual(initialOrder.slice().sort())
  })

  it('默认仅展示首批结果，展开后在筛选变更时回到默认窗口', async () => {
    const user = userEvent.setup()

    mockPetsPageCollections({
      pets: {
        updatedAt: '2026-04-23T00:00:00.000Z',
        items: Array.from({ length: 52 }, (_, index) => ({
          id: `pet-fixture-${index + 1}`,
          name: { original: `Fixture Pet ${index + 1}`, display: `测试宠物 ${index + 1}` },
          description: { original: `Fixture ${index + 1}`, display: `测试描述 ${index + 1}` },
          isAvailable: true,
          iconGraphicId: `${200 + index}`,
          illustrationGraphicId: `${500 + index}`,
          acquisition: {
            kind: 'gems',
            sourceType: 'shop',
            gemCost: 1000 + index,
            premiumPackName: null,
            premiumPackDescription: null,
            patronName: null,
            patronCurrency: null,
            patronCost: null,
            patronInfluence: null,
          },
          icon: { path: `v1/pets/icons/fixture-${index + 1}.png`, width: 128, height: 128, bytes: 1024, format: 'png' },
          illustration: { path: `v1/pets/illustrations/fixture-${index + 1}.png`, width: 512, height: 512, bytes: 4096, format: 'png' },
        })),
      },
    })

    renderPetsPage()

    const results = await screen.findByLabelText('宠物筛选结果')
    expect(within(results).getAllByRole('heading', { level: 3 })).toHaveLength(MAX_VISIBLE_PETS)

    await user.click(screen.getByRole('button', { name: `显示全部 52（默认 ${MAX_VISIBLE_PETS}）` }))

    await waitFor(() => {
      expect(within(results).getAllByRole('heading', { level: 3 })).toHaveLength(52)
    })

    await user.click(screen.getByRole('button', { name: '完整图像' }))

    await waitFor(() => {
      expect(within(results).getAllByRole('heading', { level: 3 })).toHaveLength(MAX_VISIBLE_PETS)
    })
  })
})
