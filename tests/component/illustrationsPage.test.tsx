import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
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
import type { Champion, ChampionIllustration, DataCollection, LocalizedText } from '../../src/domain/types'
import { IllustrationsPage } from '../../src/pages/IllustrationsPage'

interface StringEnumGroup {
  id: string
  values: string[]
}

interface LocalizedEnumGroup {
  id: string
  values: LocalizedText[]
}

const mockedLoadCollection = vi.mocked(loadCollection)
const writeClipboardText = vi.fn<(_: string) => Promise<void>>()

function localized(original: string, display: string): LocalizedText {
  return { original, display }
}

function createIllustration(overrides: Partial<ChampionIllustration> & Pick<ChampionIllustration, 'id' | 'championId' | 'kind' | 'seat'>): ChampionIllustration {
  const championName = overrides.championName ?? localized('Bruenor', '布鲁诺')
  const illustrationName =
    overrides.illustrationName ??
    (overrides.kind === 'hero-base' ? localized('Bruenor', '布鲁诺') : localized('Pirate Bruenor', '海盗布鲁诺'))

  return {
    id: overrides.id,
    championId: overrides.championId,
    skinId: overrides.skinId ?? null,
    kind: overrides.kind,
    seat: overrides.seat,
    championName,
    illustrationName,
    portraitPath: overrides.portraitPath ?? 'v1/champion-portraits/default.png',
    sourceSlot: overrides.sourceSlot ?? (overrides.kind === 'hero-base' ? 'base' : 'large'),
    sourceGraphicId: overrides.sourceGraphicId ?? `graphic-${overrides.id}`,
    sourceGraphic: overrides.sourceGraphic ?? `Characters/${overrides.id}`,
    sourceVersion: overrides.sourceVersion ?? 1,
    manualOverride: overrides.manualOverride ?? null,
    render:
      overrides.render ??
      {
        pipeline: 'skelanim',
        sequenceIndex: 0,
        sequenceLength: 1,
        isStaticPose: true,
        frameIndex: 0,
        visiblePieceCount: 18,
        bounds: {
          minX: -32,
          minY: -12,
          maxX: 420,
          maxY: 960,
        },
      },
    image:
      overrides.image ??
      {
        path: `v1/champion-illustrations/${overrides.kind === 'hero-base' ? 'heroes' : 'skins'}/${overrides.id}.png`,
        width: 1024,
        height: 1024,
        bytes: 65760,
        format: 'png',
      },
  }
}

const hall = localized('Companions of the Hall', '大厅伙伴团')
const emerald = localized('Emerald Enclave', '翡翠飞地')

const championsFixture: DataCollection<Champion> = {
  updatedAt: '2026-04-15',
  items: [
    {
      id: '1',
      name: localized('Bruenor', '布鲁诺'),
      seat: 1,
      roles: ['support'],
      affiliations: [hall],
      tags: ['dwarf', 'male', 'good', 'fighter', 'event', 'control_slow'],
    },
    {
      id: '2',
      name: localized('Tyril', '提里尔'),
      seat: 10,
      roles: ['tank'],
      affiliations: [emerald],
      tags: ['elf', 'male', 'good', 'druid', 'evergreen', 'positional'],
    },
  ],
}

const enumsFixture: DataCollection<StringEnumGroup | LocalizedEnumGroup> = {
  updatedAt: '2026-04-15',
  items: [
    {
      id: 'roles',
      values: ['support', 'tank'],
    },
    {
      id: 'affiliations',
      values: [hall, emerald],
    },
  ],
}

const illustrationFixture: DataCollection<ChampionIllustration> = {
  updatedAt: '2026-04-15',
  items: [
    createIllustration({
      id: 'hero-1',
      championId: '1',
      kind: 'hero-base',
      seat: 1,
      championName: localized('Bruenor', '布鲁诺'),
      illustrationName: localized('Bruenor', '布鲁诺'),
      sourceGraphicId: '8',
      sourceGraphic: 'Characters/Hero_Bruenor',
      sourceVersion: 7,
      image: {
        path: 'v1/champion-illustrations/heroes/1.png',
        width: 1024,
        height: 1024,
        bytes: 65760,
        format: 'png',
      },
    }),
    createIllustration({
      id: 'skin-3001',
      championId: '1',
      kind: 'skin',
      seat: 1,
      skinId: '3001',
      championName: localized('Bruenor', '布鲁诺'),
      illustrationName: localized('Pirate Bruenor', '海盗布鲁诺'),
      sourceGraphicId: '3004',
      sourceGraphic: 'Characters/Hero_BruenorPirate_2xup',
      sourceVersion: 3,
      image: {
        path: 'v1/champion-illustrations/skins/3001.png',
        width: 1024,
        height: 1024,
        bytes: 73640,
        format: 'png',
      },
    }),
    createIllustration({
      id: 'hero-2',
      championId: '2',
      kind: 'hero-base',
      seat: 10,
      championName: localized('Tyril', '提里尔'),
      illustrationName: localized('Tyril', '提里尔'),
      sourceGraphicId: '18',
      sourceGraphic: 'Characters/Hero_Tyril',
      sourceVersion: 5,
      image: {
        path: 'v1/champion-illustrations/heroes/2.png',
        width: 1024,
        height: 1024,
        bytes: 81234,
        format: 'png',
      },
    }),
  ],
}

function LocationProbe() {
  const location = useLocation()

  return <output data-testid="location-search">{location.search}</output>
}

function renderIllustrationsPage(initialEntries: string[] = ['/illustrations']) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <IllustrationsPage />
        <LocationProbe />
      </MemoryRouter>
    </I18nProvider>,
  )
}

beforeEach(() => {
  writeClipboardText.mockReset()
  writeClipboardText.mockResolvedValue(undefined)
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: writeClipboardText,
    },
  })

  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'champion-illustrations') {
      return illustrationFixture
    }

    if (name === 'champions') {
      return championsFixture
    }

    if (name === 'enums') {
      return enumsFixture
    }

    throw new Error(`unexpected collection: ${name}`)
  })
})

afterEach(() => {
  mockedLoadCollection.mockReset()
})

describe('IllustrationsPage', () => {
  it('渲染本地立绘目录并支持筛选皮肤立绘', async () => {
    const user = userEvent.setup()

    renderIllustrationsPage()

    const results = await screen.findByLabelText('立绘结果')
    expect(within(results).getByRole('img', { name: '布鲁诺本体立绘' })).toHaveAttribute(
      'src',
      '/data/v1/champion-illustrations/heroes/1.png',
    )
    expect(within(results).getByRole('img', { name: '布鲁诺海盗布鲁诺皮肤立绘' })).toHaveAttribute(
      'src',
      '/data/v1/champion-illustrations/skins/3001.png',
    )

    await user.click(screen.getByRole('button', { name: '皮肤' }))

    expect(screen.queryByRole('img', { name: '布鲁诺本体立绘' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: '布鲁诺海盗布鲁诺皮肤立绘' })).toBeInTheDocument()
  })

  it('支持按英雄定位过滤立绘结果', async () => {
    const user = userEvent.setup()

    renderIllustrationsPage()

    await screen.findByLabelText('立绘结果')
    await user.click(screen.getByRole('button', { name: '坦克' }))

    expect(screen.getByRole('img', { name: '提里尔本体立绘' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '布鲁诺本体立绘' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: '布鲁诺海盗布鲁诺皮肤立绘' })).not.toBeInTheDocument()
  })

  it('会把筛选状态同步进 URL 查询参数', async () => {
    const user = userEvent.setup()

    renderIllustrationsPage()

    await screen.findByLabelText('立绘结果')
    await user.click(screen.getByRole('button', { name: '皮肤' }))
    await user.click(screen.getByRole('button', { name: '辅助' }))

    const searchParams = new URLSearchParams(screen.getByTestId('location-search').textContent ?? '')

    expect(searchParams.get('scope')).toBe('skin')
    expect(searchParams.getAll('role')).toEqual(['support'])
  })

  it('支持复制当前筛选链接', async () => {
    const user = userEvent.setup()
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText')

    renderIllustrationsPage()

    await screen.findByLabelText('立绘结果')
    await user.click(screen.getByRole('button', { name: '皮肤' }))
    await user.click(screen.getByRole('button', { name: '辅助' }))

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent('?scope=skin&role=support')
    })

    await user.click(screen.getByRole('button', { name: '复制当前链接' }))

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledTimes(1)
    })

    const copiedUrl = writeTextSpy.mock.calls[0]?.[0]

    expect(copiedUrl).toContain('#/illustrations?scope=skin&role=support')
    expect(screen.getByRole('button', { name: '已复制链接' })).toBeInTheDocument()
  })

  it('默认只渲染首批立绘，展开后再显示全部', async () => {
    const user = userEvent.setup()
    const crowdedIllustrations: DataCollection<ChampionIllustration> = {
      updatedAt: '2026-04-16',
      items: Array.from({ length: 26 }, (_, index) =>
        createIllustration({
          id: `crowded-${index + 1}`,
          championId: '1',
          kind: 'skin',
          seat: 1,
          skinId: `skin-${index + 1}`,
          championName: localized('Bruenor', '布鲁诺'),
          illustrationName: localized(`Bruenor Variant ${index + 1}`, `布鲁诺变体 ${index + 1}`),
          sourceGraphicId: `g-${index + 1}`,
          sourceGraphic: `Characters/Hero_Bruenor_${index + 1}`,
        }),
      ),
    }

    mockedLoadCollection.mockImplementation(async (name) => {
      if (name === 'champion-illustrations') {
        return crowdedIllustrations
      }

      if (name === 'champions') {
        return {
          updatedAt: '2026-04-16',
          items: [championsFixture.items[0]],
        }
      }

      if (name === 'enums') {
        return {
          updatedAt: '2026-04-16',
          items: [enumsFixture.items[0], { id: 'affiliations', values: [hall] }],
        }
      }

      throw new Error(`unexpected collection: ${name}`)
    })

    renderIllustrationsPage()

    const results = await screen.findByLabelText('立绘结果')
    expect(within(results).getAllByRole('img')).toHaveLength(24)

    await user.click(screen.getByRole('button', { name: '显示全部 26 张' }))

    expect(within(results).getAllByRole('img')).toHaveLength(26)
  })

  it('支持从 URL 恢复筛选和展开状态', async () => {
    const crowdedIllustrations: DataCollection<ChampionIllustration> = {
      updatedAt: '2026-04-16',
      items: Array.from({ length: 26 }, (_, index) =>
        createIllustration({
          id: `shared-${index + 1}`,
          championId: '1',
          kind: 'skin',
          seat: 1,
          skinId: `shared-skin-${index + 1}`,
          championName: localized('Bruenor', '布鲁诺'),
          illustrationName: localized(`Bruenor Shared ${index + 1}`, `布鲁诺共享 ${index + 1}`),
          sourceGraphicId: `shared-g-${index + 1}`,
          sourceGraphic: `Characters/Hero_Bruenor_Shared_${index + 1}`,
        }),
      ),
    }

    mockedLoadCollection.mockImplementation(async (name) => {
      if (name === 'champion-illustrations') {
        return crowdedIllustrations
      }

      if (name === 'champions') {
        return {
          updatedAt: '2026-04-16',
          items: [championsFixture.items[0]],
        }
      }

      if (name === 'enums') {
        return {
          updatedAt: '2026-04-16',
          items: [enumsFixture.items[0], { id: 'affiliations', values: [hall] }],
        }
      }

      throw new Error(`unexpected collection: ${name}`)
    })

    renderIllustrationsPage(['/illustrations?scope=skin&role=support&results=all'])

    const results = await screen.findByLabelText('立绘结果')
    expect(within(results).getAllByRole('img')).toHaveLength(26)
    expect(screen.getByRole('button', { name: '皮肤' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '辅助' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('button', { name: '收起到默认 24 张' })).toHaveLength(2)
  })
})
