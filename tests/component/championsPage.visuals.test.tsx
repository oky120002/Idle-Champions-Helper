import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../src/data/client', async () => {
  const actual = await vi.importActual<typeof import('../../src/data/client')>('../../src/data/client')

  return {
    ...actual,
    loadCollection: vi.fn(),
  }
})

import { I18nProvider } from '../../src/app/i18n'
import { loadCollection } from '../../src/data/client'
import { ChampionsPage } from '../../src/pages/ChampionsPage'
import type { Champion, ChampionVisual, DataCollection, LocalizedText } from '../../src/domain/types'

interface StringEnumGroup {
  id: string
  values: string[]
}

interface LocalizedEnumGroup {
  id: string
  values: LocalizedText[]
}

function localized(original: string, display: string): LocalizedText {
  return { original, display }
}

const championsFixture: DataCollection<Champion> = {
  updatedAt: '2026-04-14',
  items: [
    {
      id: 'alpha',
      name: localized('Alpha', '阿尔法'),
      seat: 1,
      roles: ['support'],
      affiliations: [localized('Companions of the Hall', '大厅伙伴团')],
      tags: ['support', 'human', 'male', 'good'],
      portrait: {
        path: 'v1/champion-portraits/alpha.png',
        sourceGraphic: 'Portraits/Portrait_Alpha',
        sourceVersion: 2,
      },
    },
  ],
}

const enumsFixture: DataCollection<StringEnumGroup | LocalizedEnumGroup> = {
  updatedAt: '2026-04-14',
  items: [
    {
      id: 'roles',
      values: ['support'],
    },
    {
      id: 'affiliations',
      values: [localized('Companions of the Hall', '大厅伙伴团')],
    },
  ],
}

const visualsFixture: DataCollection<ChampionVisual> = {
  updatedAt: '2026-04-14',
  items: [
    {
      championId: 'alpha',
      seat: 1,
      name: localized('Alpha', '阿尔法'),
      portrait: {
        localPath: 'v1/champion-portraits/alpha.png',
        remote: {
          graphicId: '1001',
          sourceGraphic: 'Portraits/Portrait_Alpha',
          sourceVersion: 2,
          remotePath: 'mobile_assets/Portraits/Portrait_Alpha',
          remoteUrl: 'https://example.com/mobile_assets/Portraits/Portrait_Alpha',
          delivery: 'wrapped-png',
          uses: ['portrait'],
        },
      },
      base: {
        graphicId: '1000',
        sourceGraphic: 'Characters/Hero_Alpha',
        sourceVersion: 7,
        remotePath: 'mobile_assets/Characters/Hero_Alpha',
        remoteUrl: 'https://example.com/mobile_assets/Characters/Hero_Alpha',
        delivery: 'zlib-png',
        uses: ['crusader'],
      },
      skins: [
        {
          id: '2001',
          name: localized('Alpha Prime', '阿尔法典藏'),
          portrait: {
            graphicId: '1002',
            sourceGraphic: 'Portraits/Portrait_AlphaPrime',
            sourceVersion: 2,
            remotePath: 'mobile_assets/Portraits/Portrait_AlphaPrime',
            remoteUrl: 'https://example.com/mobile_assets/Portraits/Portrait_AlphaPrime',
            delivery: 'wrapped-png',
            uses: ['portrait'],
          },
          base: {
            graphicId: '1003',
            sourceGraphic: 'Characters/Hero_AlphaPrime',
            sourceVersion: 3,
            remotePath: 'mobile_assets/Characters/Hero_AlphaPrime',
            remoteUrl: 'https://example.com/mobile_assets/Characters/Hero_AlphaPrime',
            delivery: 'zlib-png',
            uses: ['crusader'],
          },
          large: {
            graphicId: '1004',
            sourceGraphic: 'Characters/Hero_AlphaPrime_2xup',
            sourceVersion: 3,
            remotePath: 'mobile_assets/Characters/Hero_AlphaPrime_2xup',
            remoteUrl: 'https://example.com/mobile_assets/Characters/Hero_AlphaPrime_2xup',
            delivery: 'zlib-png',
            uses: ['crusader'],
          },
          xl: {
            graphicId: '1005',
            sourceGraphic: 'Characters/Hero_AlphaPrime_4xup',
            sourceVersion: 3,
            remotePath: 'mobile_assets/Characters/Hero_AlphaPrime_4xup',
            remoteUrl: 'https://example.com/mobile_assets/Characters/Hero_AlphaPrime_4xup',
            delivery: 'zlib-png',
            uses: ['crusader'],
          },
        },
      ],
    },
  ],
}

const mockedLoadCollection = vi.mocked(loadCollection)
function renderChampionsPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <ChampionsPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}

beforeEach(() => {
  mockedLoadCollection.mockImplementation(async (name) => {
    if (name === 'champions') {
      return championsFixture
    }

    if (name === 'enums') {
      return enumsFixture
    }

    if (name === 'champion-visuals') {
      return visualsFixture
    }

    throw new Error(`unexpected collection: ${name}`)
  })
})

describe('ChampionsPage visuals', () => {
  it('结果卡不再暴露视觉档案入口，详情链接直接进入英雄详情页', async () => {
    renderChampionsPage()

    expect(await screen.findByText('阿尔法')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '查看 阿尔法 视觉档案' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看详情：阿尔法' })).toHaveAttribute('href', '/champions/alpha')
  })
})
